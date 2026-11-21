import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { generateSecret } from "@/lib/auth/totp";
import { startEnableSession } from "@/lib/auth/totpEnable";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (authResult.role !== "owner") {
    return NextResponse.json({ error: "You do not have access to this.", code: "AUTH_FORBIDDEN" }, { status: 403 });
  }

  const { secret, uri } = generateSecret();
  startEnableSession(authResult.userId, secret);

  return NextResponse.json(
    {
      secret,
      otpauthUri: uri,
    },
    { status: 200 }
  );
}
