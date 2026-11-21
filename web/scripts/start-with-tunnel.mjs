import { spawn } from "node:child_process";
import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";
import path from "node:path";

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid PORT "${rawPort}". Expected an integer between 1 and 65535.`);
  process.exit(1);
}

const tunnelOnly = process.argv.includes("--tunnel-only");
const url = `http://localhost:${port}`;
const POLL_INTERVAL_MS = 250;
const STARTUP_TIMEOUT_MS = 30_000;
const SHUTDOWN_FORCE_MS = 3_000;
const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
const TUNNEL_READY_RE = /\bRegistered tunnel connection\b/i;
const CLOUDFLARED_NOISE_RE = /^\d{4}-\d{2}-\d{2}T\S+\s+(INF|WRN|DBG)\b/;
const PROPAGATION_WAIT_MS = 15_000;
const PROPAGATION_POLL_MS = 1_000;

/**
 * Checks whether a local TCP server is accepting connections on `targetPort`.
 */
function isPortOpen(targetPort) {
  return new Promise((resolve) => {
    let settled = false;
    const socket = net.createConnection({ port: targetPort, host: "localhost" });

    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRunning(child) {
  return Boolean(child) && child.exitCode === null && child.signalCode === null;
}

function waitForExit(child) {
  if (!isRunning(child)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
  });
}

let server = null;
let tunnel = null;
let shuttingDown = false;
let pendingTunnelUrl = "";
let announcedTunnelUrl = "";
let tunnelRegistered = false;

async function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;

  const active = [server, tunnel].filter(isRunning);
  for (const child of active) {
    try {
      child.kill("SIGTERM");
    } catch {
      // Child may have already exited.
    }
  }

  if (active.length > 0) {
    const forceTimer = setTimeout(() => {
      for (const child of active) {
        if (isRunning(child)) {
          try {
            child.kill("SIGKILL");
          } catch {
            // Child may have already exited.
          }
        }
      }
    }, SHUTDOWN_FORCE_MS);
    forceTimer.unref();

    await Promise.all(active.map(waitForExit));
    clearTimeout(forceTimer);
  }

  process.exit(exitCode);
}

async function createAuthoritativeResolver(zone = "trycloudflare.com") {
  try {
    const nsHosts = await dns.resolveNs(zone);
    const settled = await Promise.allSettled(nsHosts.map((host) => dns.resolve4(host)));
    const nsIps = settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    if (nsIps.length === 0) {
      return null;
    }

    const resolver = new dns.Resolver({ timeout: 2_000, tries: 1 });
    resolver.setServers(nsIps);
    return resolver;
  } catch {
    return null;
  }
}

function headEdge(ip, hostname) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: ip,
        port: 443,
        path: "/",
        method: "HEAD",
        servername: hostname,
        headers: { host: hostname },
        timeout: 3_000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

async function waitForTunnelReachable(candidateUrl) {
  const deadline = Date.now() + PROPAGATION_WAIT_MS;
  const { hostname } = new URL(candidateUrl);
  const authResolver = await createAuthoritativeResolver();

  if (!authResolver) {
    await sleep(3_000);
    return;
  }

  while (!shuttingDown && isRunning(tunnel) && Date.now() < deadline) {
    try {
      const ips = await authResolver.resolve4(hostname);
      if (ips.length > 0) {
        const status = await headEdge(ips[0], hostname);
        if (status > 0 && status !== 503 && status !== 530) {
          return;
        }
      }
    } catch {
      // Authoritative DNS or edge route propagation may still be completing.
    }

    if (!shuttingDown && isRunning(tunnel) && Date.now() < deadline) {
      await sleep(PROPAGATION_POLL_MS);
    }
  }
}

async function maybeAnnounceTunnelUrl() {
  if (!tunnelRegistered || !pendingTunnelUrl || pendingTunnelUrl === announcedTunnelUrl) {
    return;
  }

  const candidateUrl = pendingTunnelUrl;
  announcedTunnelUrl = candidateUrl;

  await waitForTunnelReachable(candidateUrl);

  if (!shuttingDown && isRunning(tunnel)) {
    console.log(`\n  Tunnel URL: ${candidateUrl} -> ${url}\n`);
  }
}

function handleTunnelLine(line) {
  if (shuttingDown) return;

  const match = line.match(TUNNEL_URL_RE);
  if (match && match[0] !== pendingTunnelUrl) {
    pendingTunnelUrl = match[0];
    void maybeAnnounceTunnelUrl();
  }

  if (!tunnelRegistered && TUNNEL_READY_RE.test(line)) {
    tunnelRegistered = true;
    void maybeAnnounceTunnelUrl();
  }

  if (!line.trim() || CLOUDFLARED_NOISE_RE.test(line)) {
    return;
  }

  process.stderr.write(`${line}\n`);
}

function attachTunnelStream(stream) {
  if (!stream) return;

  let remainder = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    const combined = remainder + chunk;
    const lines = combined.split(/\r?\n/);
    remainder = lines.pop() ?? "";
    for (const line of lines) {
      handleTunnelLine(line);
    }
  });
  stream.on("end", () => {
    if (remainder) {
      handleTunnelLine(remainder);
      remainder = "";
    }
  });
}

function startTunnel() {
  console.log(`Starting Cloudflare tunnel for ${url}...`);
  tunnel = spawn("cloudflared", ["tunnel", "--url", url], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  attachTunnelStream(tunnel.stdout);
  attachTunnelStream(tunnel.stderr);

  tunnel.on("error", (err) => {
    if (err.code === "ENOENT") {
      console.error(
        "cloudflared is not installed or not on PATH. Install it with: brew install cloudflared",
      );
    } else {
      console.error(`Failed to start cloudflared: ${err.message}`);
    }
    void shutdown(1);
  });

  tunnel.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    console.error(`cloudflared exited unexpectedly with ${reason}.`);
    void shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

if (tunnelOnly) {
  startTunnel();
} else {
  if (await isPortOpen(port)) {
    console.error(
      `Port ${port} is already in use. Stop the existing server first (or run "npm run tunnel" to attach a tunnel to the running server, or set PORT=<port>).`,
    );
    process.exit(1);
  }

  const nextBin = path.resolve(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next",
  );

  server = spawn(nextBin, ["start", "-p", String(port)], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  server.on("error", (err) => {
    console.error(`Failed to start Next.js server: ${err.message}`);
    void shutdown(1);
  });

  server.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    console.error(`Next.js server exited unexpectedly with ${reason}.`);
    void shutdown(code ?? 1);
  });

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let ready = false;

  while (!shuttingDown && isRunning(server) && Date.now() < deadline) {
    if (await isPortOpen(port)) {
      ready = true;
      break;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  if (shuttingDown || !isRunning(server)) {
    // Server error/exit or signal handler already initiated shutdown.
  } else if (!ready) {
    console.error(`Timed out waiting for Next.js server on ${url}.`);
    await shutdown(1);
  } else {
    startTunnel();
  }
}
