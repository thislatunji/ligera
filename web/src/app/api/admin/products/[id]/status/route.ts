import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { updateProductStatus } from "@/lib/services/catalog/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const result = await updateProductStatus(id, body.status, auth.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.code === "INVALID_TRANSITION") {
      return NextResponse.json({ error: "Archived products can only be restored to draft.", code: "INVALID_TRANSITION" }, { status: 409 });
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "We couldn't find that product.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
