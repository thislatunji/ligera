import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getCustomRequestById } from "@/lib/services/custom-requests/inbox";

export async function GET(request: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) {
    if (auth.status === 403) {
      return NextResponse.json({ error: "Only the owner manages custom requests." }, { status: 403 });
    }
    return auth;
  }
  const resolvedParams = await Promise.resolve((params as any));
  const id = resolvedParams.id;

  try {
    const result = await getCustomRequestById(id);
    if (!result) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
