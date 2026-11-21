import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { ConfirmResetRequest } from "@/lib/api/schemas/auth";
import { hashPassword } from "@/lib/auth/bcrypt";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const body = await request.json();
    const parsed = ConfirmResetRequest.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "This reset link has expired or is invalid.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      resetTokenHash: tokenHash,
      resetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This reset link has expired or is invalid.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    user.passwordHash = await hashPassword(password);
    user.resetTokenHash = null;
    user.resetExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    try {
      await ActivityLog.create({
        userId: user._id,
        action: "auth.password.reset",
        entity: { type: "user", id: user._id.toString() },
        before: null,
        after: null,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "This reset link has expired or is invalid.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "This reset link has expired or is invalid.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
}
