import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as signPOST } from "@/app/api/admin/uploads/sign/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { hashPassword } from "@/lib/auth/bcrypt";
import crypto from "crypto";

async function seedUser(overrides: Partial<any> = {}) {
  await connectDb();
  const passwordHash = await hashPassword(overrides.password || "password123");
  const user = await User.create({
    name: overrides.name || "User",
    email: (overrides.email || "user@ligera.ng").toLowerCase(),
    passwordHash,
    role: overrides.role || "staff",
    twoFactorEnabled: false,
    twoFactorSecretEncrypted: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
  });
  return user;
}

describe("POST /api/admin/uploads/sign", () => {
  beforeEach(async () => {
    await connectDb();
    await User.deleteMany({});
    await ActivityLog.deleteMany({});
    vi.restoreAllMocks();
    process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "test-secret";
  });

  it("staff allowed, unauthenticated → 401; signature matches sha1(\"folder=ligera&timestamp=<ts>\" + secret) with mocked Cloudinary util; logs upload.sign", async () => {
    // unauthenticated
    const unauthReq = new NextRequest("http://localhost/api/admin/uploads/sign", {
      method: "POST",
      body: JSON.stringify({ folder: "ligera" }),
    });
    const unauthRes = await signPOST(unauthReq);
    expect(unauthRes.status).toBe(401);

    // staff allowed
    const staff = await seedUser({ email: "staff@ligera.ng", role: "staff", password: "password123" });
    const loginReq = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "staff@ligera.ng", password: "password123" }),
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

    const signReq = new NextRequest("http://localhost/api/admin/uploads/sign", {
      method: "POST",
      headers: { cookie: cookieHeader },
      body: JSON.stringify({ folder: "ligera" }),
    });
    const signRes = await signPOST(signReq);
    expect(signRes.status).toBe(200);
    const json = await signRes.json();
    expect(json.signature).toBeTruthy();
    expect(json.timestamp).toBeTruthy();

    // Verify signature
    const expected = crypto.createHash("sha1").update(`folder=ligera&timestamp=${json.timestamp}${process.env.CLOUDINARY_API_SECRET}`).digest("hex");
    expect(json.signature).toBe(expected);

    const logs = await ActivityLog.find({ action: "upload.sign" });
    expect(logs.length).toBeGreaterThan(0);
  });
});
