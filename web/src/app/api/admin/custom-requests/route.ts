import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listCustomRequests } from "@/lib/services/custom-requests/inbox";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) {
    if (auth.status === 403) {
      return NextResponse.json({ error: "Only the owner manages custom requests." }, { status: 403 });
    }
    return auth;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const q = searchParams.get("q") || undefined;
    const result = await listCustomRequests({ status: status as any, q });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
