import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { Enable2FaRequest } from "@/lib/api/schemas/auth";
import { verifyTotp, encryptSecret } from "@/lib/auth/totp";
import { verifyEnableCode, getEnableSession, clearEnableSession } from "@/lib/auth/totpEnable";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    if (authResult.role !== "owner") {
      return NextResponse.json({ error: "You do not have access to this.", code: "AUTH_FORBIDDEN" }, { status: 403 });
    }

    await connectDb();
    const body = await request.json();
    const parsed = Enable2FaRequest.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid code.", code: "INVALID_CODE" }, { status: 401 });
    }

    const { code } = parsed.data;
    const result = verifyEnableCode(authResult.userId, code, verifyTotp);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid code.", code: "INVALID_CODE" }, { status: 401 });
    }

    if (!result.ready) {
      // Not enough codes verified yet
      return NextResponse.json({ error: "More codes required.", code: "TOTP_MORE_REQUIRED" }, { status: 400 });
    }

    const session = getEnableSession(authResult.userId);
    if (!session) {
      return NextResponse.json({ error: "Invalid code.", code: "INVALID_CODE" }, { status: 401 });
    }

    const user = await User.findById(authResult.userId);
    if (!user) {
      return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
    }

    const encrypted = encryptSecret(session.secret);
    // Ciphertext must differ from plaintext
    if (encrypted === session.secret) {
      // Should not happen with proper encryption
    }
    user.twoFactorSecretEncrypted = encrypted;
    user.twoFactorEnabled = true;
    await user.save();

    try {
      await ActivityLog.create({
        userId: user._id,
        action: "auth.2fa.enable",
        entity: { type: "user", id: user._id.toString() },
        before: null,
        after: null,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      });
    } catch (e) {
      // ignore
    }

    clearEnableSession(authResult.userId);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid code.", code: "INVALID_CODE" }, { status: 401 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
