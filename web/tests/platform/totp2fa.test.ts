import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as setupPOST } from "@/app/api/auth/2fa/setup/route";
import { POST as enablePOST } from "@/app/api/auth/2fa/enable/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { hashPassword } from "@/lib/auth/bcrypt";
import * as totp from "@/lib/auth/totp";

async function seedUser(overrides: Partial<any> = {}) {
  await connectDb();
  const passwordHash = await hashPassword(overrides.password || "password123");
  const user = await User.create({
    name: overrides.name || "User",
    email: (overrides.email || "owner@ligera.ng").toLowerCase(),
    passwordHash,
    role: overrides.role || "owner",
    twoFactorEnabled: overrides.twoFactorEnabled || false,
    twoFactorSecretEncrypted: overrides.twoFactorSecretEncrypted || null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
  });
  return user;
}

describe("TOTP 2FA", () => {
  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await ActivityLog.deleteMany({});
    vi.restoreAllMocks();
  });

  it("setup: owner-only (staff → 403 AUTH_FORBIDDEN), returns secret once, persists nothing", async () => {
    // staff
    const staff = await seedUser({ email: "staff@ligera.ng", role: "staff" });
    // Get token for staff
    const loginReq = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "staff@ligera.ng", password: "password123" }),
    });
    const loginRes = await loginPOST(loginReq);
    console.log("DEBUG1:", loginRes.status);
    let atToken: string | undefined;
    const cookies = loginRes.headers.get("set-cookie") || loginRes.headers.getSetCookie?.().join("; ") || "";
    let atMatch = cookies.match(/ligera_at=([^;,\s]+)/);
    if (atMatch) atToken = atMatch[1];
    if (!atToken && (loginRes as any).cookies?.get) {
      atToken = (loginRes as any).cookies.get('ligera_at')?.value;
    }
    if (!atToken) throw new Error("no cookie");

    const setupReqStaff = new NextRequest("http://localhost/api/auth/2fa/setup", {
      method: "POST",
      headers: { cookie: `ligera_at=${atToken}` },
    });
    const setupResStaff = await setupPOST(setupReqStaff);
    expect(setupResStaff.status).toBe(403);
    const staffJson = await setupResStaff.json();
    expect(staffJson.code).toBe("AUTH_FORBIDDEN");

    // owner
    const owner = await seedUser({ email: "owner@ligera.ng", role: "owner" });
    const loginReq2 = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123" }),
    });
    const loginRes2 = await loginPOST(loginReq2);
    let atToken2: string | undefined;
    const cookies2 = loginRes2.headers.get("set-cookie") || loginRes2.headers.getSetCookie?.().join("; ") || "";
    let atMatch2 = cookies2.match(/ligera_at=([^;,\s]+)/);
    if (atMatch2) atToken2 = atMatch2[1];
    if (!atToken2 && (loginRes2 as any).cookies?.get) {
      atToken2 = (loginRes2 as any).cookies.get('ligera_at')?.value;
    }
    if (!atToken2) throw new Error("no cookie2");

    const setupReq = new NextRequest("http://localhost/api/auth/2fa/setup", {
      method: "POST",
      headers: { cookie: `ligera_at=${atToken2}` },
    });
    const setupRes = await setupPOST(setupReq);
    expect(setupRes.status).toBe(200);
    const setupJson = await setupRes.json();
    expect(setupJson.secret || setupJson.otpauthUri).toBeTruthy();

    const ownerAfter = await User.findById(owner._id);
    expect(ownerAfter?.twoFactorEnabled).toBe(false);
    expect(ownerAfter?.twoFactorSecretEncrypted).toBeFalsy();
  });

  it("enable: 3 valid codes required before persist; encrypted secret at rest (assert ciphertext ≠ plaintext)", async () => {
    const owner = await seedUser({ email: "owner@ligera.ng", role: "owner" });
    const loginReq = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123" }),
    });
    const loginRes = await loginPOST(loginReq);
    let atToken: string | undefined;
    const cookies = loginRes.headers.get("set-cookie") || loginRes.headers.getSetCookie?.().join("; ") || "";
    let atMatch = cookies.match(/ligera_at=([^;,\s]+)/);
    if (atMatch) atToken = atMatch[1];
    if (!atToken && (loginRes as any).cookies?.get) {
      atToken = (loginRes as any).cookies.get('ligera_at')?.value;
    }
    if (!atToken) throw new Error("no cookie");
    const cookieHeader = `ligera_at=${atToken}`;

    const setupReq = new NextRequest("http://localhost/api/auth/2fa/setup", {
      method: "POST",
      headers: { cookie: cookieHeader },
    });
    const setupRes = await setupPOST(setupReq);
    const setupJson = await setupRes.json();
    const secret = setupJson.secret;

    vi.spyOn(totp, "verifyTotp").mockReturnValue(true);

    // First code
    const enableReq1 = new NextRequest("http://localhost/api/auth/2fa/enable", {
      method: "POST",
      headers: { cookie: cookieHeader },
      body: JSON.stringify({ code: "123456" }),
    });
    const enableRes1 = await enablePOST(enableReq1);
    expect(enableRes1.status).not.toBe(200);

    // Second code
    const enableReq2 = new NextRequest("http://localhost/api/auth/2fa/enable", {
      method: "POST",
      headers: { cookie: cookieHeader },
      body: JSON.stringify({ code: "123456" }),
    });
    const enableRes2 = await enablePOST(enableReq2);
    expect(enableRes2.status).not.toBe(200);

    // Third code - should persist
    const enableReq3 = new NextRequest("http://localhost/api/auth/2fa/enable", {
      method: "POST",
      headers: { cookie: cookieHeader },
      body: JSON.stringify({ code: "123456" }),
    });
    const enableRes3 = await enablePOST(enableReq3);
    expect(enableRes3.status).toBe(200);

    const ownerAfter = await User.findById(owner._id);
    expect(ownerAfter?.twoFactorEnabled).toBe(true);
    expect(ownerAfter?.twoFactorSecretEncrypted).toBeTruthy();
    expect(ownerAfter?.twoFactorSecretEncrypted).not.toBe(secret);

    const logs = await ActivityLog.find({ action: "auth.2fa.enable" });
    expect(logs.length).toBeGreaterThan(0);
  });
});
