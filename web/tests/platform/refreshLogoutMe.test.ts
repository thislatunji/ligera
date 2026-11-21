import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as refreshPOST } from "@/app/api/auth/refresh/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { GET as meGET } from "@/app/api/auth/me/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { hashPassword } from "@/lib/auth/bcrypt";

async function seedOwner(overrides: Partial<any> = {}) {
  await connectDb();
  const passwordHash = await hashPassword(overrides.password || "password123");
  const user = await User.create({
    name: overrides.name || "Owner",
    email: (overrides.email || "owner@ligera.ng").toLowerCase(),
    passwordHash,
    role: overrides.role || "owner",
    twoFactorEnabled: overrides.twoFactorEnabled || false,
    twoFactorSecretEncrypted: overrides.twoFactorSecretEncrypted || null,
    failedLoginAttempts: overrides.failedLoginAttempts || 0,
    lockedUntil: overrides.lockedUntil || null,
    lastLoginAt: overrides.lastLoginAt || null,
  });
  return user;
}

describe("refresh, logout, me", () => {
  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await ActivityLog.deleteMany({});
    vi.restoreAllMocks();
  });

  it("refresh: missing cookie → 401", async () => {
    const req = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
    const res = await refreshPOST(req);
    expect(res.status).toBe(401);
  });

  it("valid refresh → new access + rotated refresh; replayed (denied jti) → 401", async () => {
    await seedOwner({ email: "owner@ligera.ng", password: "password123" });
    const loginReq = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123" }),
    });
    const loginRes = await loginPOST(loginReq);
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers.get("set-cookie") || "";

    // Extract refresh cookie
    const rtMatch = cookies.match(/ligera_rt=([^;]+)/);
    expect(rtMatch).toBeTruthy();
    const rtCookie = rtMatch![1];

    const refreshReq = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { cookie: `ligera_rt=${rtCookie}` },
    });
    const refreshRes = await refreshPOST(refreshReq);
    expect(refreshRes.status).toBe(200);
    const refreshCookies = refreshRes.headers.get("set-cookie") || "";
    expect(refreshCookies).toContain("ligera_at");

    // Replay with old cookie
    const replayReq = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { cookie: `ligera_rt=${rtCookie}` },
    });
    const replayRes = await refreshPOST(replayReq);
    expect(replayRes.status).toBe(401);
  });

  it("logout: clears both cookies", async () => {
    const req = new NextRequest("http://localhost/api/auth/logout", { method: "POST" });
    const res = await logoutPOST(req);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("ligera_at");
    expect(setCookie).toContain("ligera_rt");
  });

  it("me: no cookie → 401; valid → CurrentUser", async () => {
    const noCookieReq = new NextRequest("http://localhost/api/auth/me");
    const noCookieRes = await meGET(noCookieReq);
    expect(noCookieRes.status).toBe(401);

    await seedOwner({ email: "owner@ligera.ng", password: "password123" });
    const loginReq = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123" }),
    });
    const loginRes = await loginPOST(loginReq);
    const cookies = loginRes.headers.get("set-cookie") || "";
    const atMatch = cookies.match(/ligera_at=([^;]+)/);
    expect(atMatch).toBeTruthy();

    const meReq = new NextRequest("http://localhost/api/auth/me", {
      headers: { cookie: `ligera_at=${atMatch![1]}` },
    });
    const meRes = await meGET(meReq);
    expect(meRes.status).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.user || meJson).toBeTruthy();
  });
});
