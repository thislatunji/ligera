import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { StatusUpdateInput } from "@/lib/api/schemas/custom-requests";
import { updateCustomRequestStatus } from "@/lib/services/custom-requests/status";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
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
    const body = await request.json();
    const parsed = StatusUpdateInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    try {
      const result = await updateCustomRequestStatus(id, parsed.data.status, parsed.data.note, auth);
      return NextResponse.json(result);
    } catch (err: any) {
      if (err.code === "NOT_FOUND") {
        return NextResponse.json({ error: err.message || "Request not found." }, { status: 404 });
      }
      if (err.code === "INVALID_TRANSITION") {
        return NextResponse.json({ error: err.message || "Invalid transition.", code: "INVALID_TRANSITION" }, { status: 409 });
      }
      throw err;
    }
  } catch (error: any) {
    if (error.code === "INVALID_TRANSITION") {
      return NextResponse.json({ error: error.message || "Invalid transition.", code: "INVALID_TRANSITION" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
