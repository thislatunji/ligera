/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { signAccessToken, signGateToken } from "@/lib/auth/jwt";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("Stealth /ligera middleware & scanner shield", () => {
  it("masks legacy /admin, /auth, and /wp-admin probe paths with 404 (never redirects)", async () => {
    for (const path of ["/admin", "/admin/login", "/admin/orders", "/auth", "/wp-admin/index.php", "/wp-login.php"]) {
      const req = new NextRequest(`http://localhost:3000${path}`, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(404);
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-rewrite")).toContain("/__not_found__");
    }
  });

  it("masks unauthenticated /ligera/* sub-routes with 404 (never redirects to login)", async () => {
    for (const path of ["/ligera/products", "/ligera/orders", "/ligera/settings", "/ligera/login"]) {
      const req = new NextRequest(`http://localhost:3000${path}`, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(404);
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-rewrite")).toContain("/__not_found__");
    }
  });

  it("rejects forged or invalid cookies on /ligera/* with 404", async () => {
    const req = new NextRequest("http://localhost:3000/ligera/products", {
      headers: {
        "user-agent": "Mozilla/5.0",
        cookie: "ligera_at=forged.jwt.token; lg_session=bad.gate.token",
      },
    });
    const res = await middleware(req);
    expect(res.status).toBe(404);
    expect(res.headers.get("x-middleware-rewrite")).toContain("/__not_found__");
  });

  it("returns 404 to known scanner user-agents on /ligera and /api/admin/*", async () => {
    for (const ua of ["Nikto/2.1.6", "sqlmap/1.7", "gobuster/3.6"]) {
      const pageReq = new NextRequest("http://localhost:3000/ligera", {
        headers: { "user-agent": ua },
      });
      const pageRes = await middleware(pageReq);
      expect(pageRes.status).toBe(404);

      const apiReq = new NextRequest("http://localhost:3000/api/admin/products", {
        headers: { "user-agent": ua },
      });
      const apiRes = await middleware(apiReq);
      expect(apiRes.status).toBe(404);
    }
  });

  it("allows browser access to /ligera with hardened anti-index & anti-frame headers", async () => {
    const req = new NextRequest("http://localhost:3000/ligera", {
      headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("allows verified access token OR gate token on /ligera/* sub-routes", async () => {
    const accessToken = await signAccessToken({ sub: "user1", role: "owner" });
    const reqWithAt = new NextRequest("http://localhost:3000/ligera/products", {
      headers: {
        "user-agent": "Mozilla/5.0",
        cookie: `ligera_at=${accessToken}`,
      },
    });
    const resWithAt = await middleware(reqWithAt);
    expect(resWithAt.status).toBe(200);
    expect(resWithAt.headers.get("x-robots-tag")).toContain("noindex");

    const gateToken = await signGateToken({ sub: "user1", role: "staff" });
    const reqWithGate = new NextRequest("http://localhost:3000/ligera/orders", {
      headers: {
        "user-agent": "Mozilla/5.0",
        cookie: `lg_session=${gateToken}`,
      },
    });
    const resWithGate = await middleware(reqWithGate);
    expect(resWithGate.status).toBe(200);
    expect(resWithGate.headers.get("x-frame-options")).toBe("DENY");
  });

  it("never exposes /ligera in robots.txt or sitemap.xml", async () => {
    const robotsCfg = robots();
    const rules = Array.isArray(robotsCfg.rules) ? robotsCfg.rules : [robotsCfg.rules];
    const allDisallows = rules.flatMap((r) =>
      Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : [],
    );
    expect(allDisallows.some((p) => p.startsWith("/ligera"))).toBe(false);

    const entries = await sitemap();
    const pathnames = entries.map((e) => new URL(e.url).pathname);
    expect(pathnames.some((p) => p.startsWith("/ligera"))).toBe(false);
  });
});
