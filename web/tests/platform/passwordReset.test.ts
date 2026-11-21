import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as requestResetPOST } from "@/app/api/auth/password/request-reset/route";
import { POST as confirmResetPOST } from "@/app/api/auth/password/confirm-reset/route";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { hashPassword } from "@/lib/auth/bcrypt";
import crypto from "crypto";
import * as enqueue from "@/lib/services/notifications/enqueue";

async function seedOwner(overrides: Partial<any> = {}) {
  await connectDb();
  const passwordHash = await hashPassword(overrides.password || "password123");
  const user = await User.create({
    name: overrides.name || "Owner",
    email: (overrides.email || "owner@ligera.ng").toLowerCase(),
    passwordHash,
    role: overrides.role || "owner",
    twoFactorEnabled: false,
    twoFactorSecretEncrypted: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
  });
  return user;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

describe("password reset", () => {
  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await ActivityLog.deleteMany({});
    vi.restoreAllMocks();
  });

  it("request-reset: enqueues email (mocked enqueueNotification with type password.reset); always 200; stores only sha256 hash; rate limit → 429", async () => {
    const user = await seedOwner({ email: "owner@ligera.ng" });
    const enqueueSpy = vi.spyOn(enqueue, "enqueueNotification").mockResolvedValue({ inserted: true });

    const req = new NextRequest("http://localhost/api/auth/password/request-reset", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng" }),
    });
    const res = await requestResetPOST(req);
    expect(res.status).toBe(200);
    expect(enqueueSpy).toHaveBeenCalled();
    const call = enqueueSpy.mock.calls[0];
    expect(call[0]).toBe("password.reset");

    const updated = await User.findById(user._id);
    expect(updated?.resetTokenHash).toBeTruthy();
    expect(updated?.resetTokenHash).not.toContain(" "); // hash
    // Should be sha256 hex
    expect(updated?.resetTokenHash?.length).toBe(64);

    // Rate limit
    for (let i = 0; i < 4; i++) {
      const r = new NextRequest("http://localhost/api/auth/password/request-reset", {
        method: "POST",
        body: JSON.stringify({ email: "owner@ligera.ng" }),
        headers: { "x-forwarded-for": "1.2.3.4" },
      });
      await requestResetPOST(r);
    }
    const limited = new NextRequest("http://localhost/api/auth/password/request-reset", {
      method: "POST",
      body: JSON.stringify({ email: "owner@ligera.ng" }),
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const limitedRes = await requestResetPOST(limited);
    expect(limitedRes.status).toBe(429);
  });

  it("confirm-reset: valid token updates hash; expired → 400; clears lockout fields", async () => {
    const user = await seedOwner({ email: "owner@ligera.ng", password: "oldpass123", failedLoginAttempts: 3, lockedUntil: new Date(Date.now() + 10000) });
    const token = "a".repeat(40);
    user.resetTokenHash = hashToken(token);
    user.resetExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const req = new NextRequest("http://localhost/api/auth/password/confirm-reset", {
      method: "POST",
      body: JSON.stringify({ token, password: "newpass123" }),
    });
    const res = await confirmResetPOST(req);
    expect(res.status).toBe(200);
    const updated = await User.findById(user._id);
    expect(updated?.failedLoginAttempts).toBe(0);
    expect(updated?.lockedUntil).toBeNull();
    expect(updated?.resetTokenHash).toBeNull();

    const logs = await ActivityLog.find({ action: "auth.password.reset" });
    expect(logs.length).toBeGreaterThan(0);
  });
});
