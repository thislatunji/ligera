import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guard";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { comparePassword, hashPassword } from "@/lib/auth/bcrypt";

const ChangePasswordRequest = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDb();
    const body = await request.json();
    const parsed = ChangePasswordRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const matches = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json(
        { error: "Current password is incorrect.", code: "AUTH_INVALID" },
        { status: 401 }
      );
    }

    user.passwordHash = await hashPassword(parsed.data.newPassword);
    await user.save();

    try {
      await ActivityLog.create({
        userId: user._id,
        action: "auth.password.change",
        entity: { type: "user", id: user._id.toString() },
        before: null,
        after: null,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      });
    } catch {
      // Do not fail password update if audit logging fails
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong on our side.", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
