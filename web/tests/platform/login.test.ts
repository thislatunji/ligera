import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { hashPassword } from "@/lib/auth/bcrypt";
import * as totp from "@/lib/auth/totp";

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

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await ActivityLog.deleteMany({});
    vi.restoreAllMocks();
  });

  it("valid email + password → sets cookies (assert Set-Cookie contains ligera_at, HttpOnly, SameSite=Lax), returns CurrentUser with role: \"owner\"", async () => {
    await seedOwner({ email: "owner@ligera.ng", password: "password123", role: "owner" });
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.role).toBe("owner");
    expect(json.user.email).toBe("owner@ligera.ng");
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("ligera_at");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("wrong password → 401 AUTH_INVALID; failedLoginAttempts incremented", async () => {
    const user = await seedOwner({ email: "owner@ligera.ng", password: "password123" });
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "wrongpass123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("AUTH_INVALID");
    const updated = await User.findById(user._id);
    expect(updated?.failedLoginAttempts).toBe(1);
  });

  it("5th failure → lockedUntil set; 6th attempt → 429 AUTH_LOCKED with minutes remaining", async () => {
    const user = await seedOwner({ email: "owner@ligera.ng", password: "password123", failedLoginAttempts: 4 });
    // 5th failure
    const req5 = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "wrongpass123" }),
    });
    const res5 = await POST(req5);
    expect(res5.status).toBe(401);
    expect(res5.json ? (await res5.json()).code : (await res5.clone().json()).code).toBe("AUTH_INVALID");
    const after5 = await User.findById(user._id);
    expect(after5?.lockedUntil).toBeTruthy();

    // 6th attempt
    const req6 = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "wrongpass123" }),
    });
    const res6 = await POST(req6);
    expect(res6.status).toBe(429);
    const json6 = await res6.json();
    expect(json6.code).toBe("AUTH_LOCKED");
    expect(json6.error).toMatch(/minutes/);
  });

  it("twoFactorEnabled + no code → 401 TOTP_REQUIRED", async () => {
    await seedOwner({ email: "owner@ligera.ng", password: "password123", twoFactorEnabled: true, twoFactorSecretEncrypted: "test" });
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("TOTP_REQUIRED");
  });

  it("twoFactorEnabled + valid mocked TOTP → 200; invalid → 401", async () => {
    const user = await seedOwner({ email: "owner@ligera.ng", password: "password123", twoFactorEnabled: true, twoFactorSecretEncrypted: Buffer.from("secret").toString("base64") }); // dummy
    // Mock verifyTotp
    vi.spyOn(totp, "verifyTotp").mockReturnValue(true);
    const reqValid = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123", totpCode: "123456" }),
    });
    const resValid = await POST(reqValid);
    expect(resValid.status).toBe(200);

    // Reset user state
    await User.updateOne({ _id: user._id }, { failedLoginAttempts: 0, lockedUntil: null });
    vi.spyOn(totp, "verifyTotp").mockReturnValue(false);
    const reqInvalid = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123", totpCode: "000000" }),
    });
    const resInvalid = await POST(reqInvalid);
    expect(resInvalid.status).toBe(401);
  });

  it("unknown email → 401 AUTH_INVALID (identical body — no enumeration)", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "unknown@ligera.ng", password: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("AUTH_INVALID");
    expect(json.error).toBe("Email or password is incorrect.");
  });

  it("activity_logs gains auth.login on success", async () => {
    await seedOwner({ email: "owner@ligera.ng", password: "password123" });
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng", password: "password123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const logs = await ActivityLog.find({});
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe("auth.login");
  });

  it("route test: parses LoginRequest; malformed body → 400 VALIDATION_ERROR", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });
});
