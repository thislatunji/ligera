import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { RequestResetRequest } from "@/lib/api/schemas/auth";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import crypto from "crypto";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 4;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) {
    return false;
  }
  entry.count++;
  return true;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const body = await request.json().catch(() => ({}));
    const parsed = RequestResetRequest.safeParse(body);

    if (!parsed.success) {
      // Still might return 200 to prevent enumeration? Let us look up - schema validation, but probably follow pattern
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { email } = parsed.data;
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || email;
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests.", code: "RATE_LIMITED" }, { status: 429 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      user.resetTokenHash = tokenHash;
      user.resetExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      try {
        await enqueueNotification("password.reset", { email: user.email, token });
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
