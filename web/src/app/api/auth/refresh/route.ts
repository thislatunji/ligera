import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import { verifyRefreshToken, signAccessToken, signRefreshToken, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from "@/lib/auth/jwt";
import { isJtiDenied, denyJti } from "@/lib/auth/refreshTokens";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("ligera_rt")?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
    }

    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch (error) {
      return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
    }

    if (payload.type !== "refresh" || !payload.jti) {
      return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
    }

    if (isJtiDenied(payload.jti)) {
      return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
    }

    await connectDb();
    const user = await User.findById(payload.sub);
    if (!user) {
      return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
    }

    // Rotate - deny old jti
    denyJti(payload.jti);

    const accessToken = await signAccessToken({ sub: user._id.toString(), role: user.role });
    const newRefreshToken = await signRefreshToken({ sub: user._id.toString(), jti: randomUUID() });

    const response = NextResponse.json({ ok: true }, { status: 200 });

    response.cookies.set("ligera_at", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: "/",
    });

    response.cookies.set("ligera_rt", newRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: "/api/auth",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Please sign in again.", code: "AUTH_UNAUTHENTICATED" }, { status: 401 });
  }
}
