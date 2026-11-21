import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  return NextResponse.json(
    {
      user: {
        id: authResult.userId,
        name: authResult.name,
        email: authResult.email,
        role: authResult.role,
      },
    },
    { status: 200 }
  );
}
