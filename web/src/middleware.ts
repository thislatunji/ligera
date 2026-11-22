import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SCANNER_UA_REGEX =
  /nikto|sqlmap|gobuster|dirbuster|ffuf|nuclei|wpscan|nmap|masscan|zgrab|acunetix|nessus|openvas|feroxbuster|dirsearch|wfuzz|havij|burpsuite|httpx/i;

function getAccessSecretBytes(): Uint8Array {
  const secret =
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "access-secret-key-for-testing";
  return new TextEncoder().encode(secret);
}

async function verifySessionToken(
  token: string | undefined,
  expectedType: "access" | "gate",
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getAccessSecretBytes(), {
      algorithms: ["HS256"],
    });
    const role = payload?.role;
    return (
      payload?.type === expectedType &&
      (role === "owner" || role === "staff") &&
      typeof payload?.sub === "string" &&
      payload.sub.length > 0
    );
  } catch {
    return false;
  }
}

async function hasValidAdminSession(request: NextRequest): Promise<boolean> {
  const accessCookie = request.cookies.get("ligera_at")?.value;
  if (await verifySessionToken(accessCookie, "access")) {
    return true;
  }
  const gateCookie = request.cookies.get("lg_session")?.value;
  return verifySessionToken(gateCookie, "gate");
}

function stealthNotFound(request: NextRequest): NextResponse {
  const url = new URL("/__not_found__", request.url);
  const res = NextResponse.rewrite(url, { status: 404 });
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  return res;
}

function applyHardenedHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  // Block known vulnerability / directory scanners cleanly with 404
  if (SCANNER_UA_REGEX.test(userAgent)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return stealthNotFound(request);
  }

  // Mask legacy/common admin probe paths with 404 (never redirect)
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/wp-admin") ||
    pathname === "/wp-login.php"
  ) {
    return stealthNotFound(request);
  }

  // All sub-routes under /ligera/* require a verified session; otherwise appear nonexistent (404)
  if (pathname.startsWith("/ligera/")) {
    const authed = await hasValidAdminSession(request);
    if (!authed) {
      return stealthNotFound(request);
    }
    return applyHardenedHeaders(NextResponse.next());
  }

  // /ligera entry route renders login inline when unauthenticated or dashboard when signed in
  if (pathname === "/ligera") {
    return applyHardenedHeaders(NextResponse.next());
  }

  // Ensure /api/admin/* and /api/auth/* responses are never indexed or cached
  if (pathname.startsWith("/api/admin/") || pathname.startsWith("/api/auth/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ligera",
    "/ligera/:path*",
    "/admin",
    "/admin/:path*",
    "/auth",
    "/auth/:path*",
    "/wp-admin/:path*",
    "/wp-login.php",
    "/api/admin/:path*",
    "/api/auth/:path*",
  ],
};
