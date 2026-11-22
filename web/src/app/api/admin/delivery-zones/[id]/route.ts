import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { updateZone, deleteZone } from "@/lib/services/admin/zones";
import { ZoneInput } from "@/lib/api/schemas/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const parsed = ZoneInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    const result = await updateZone(id, parsed.data, auth.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await Promise.resolve(params);
    const result = await deleteZone(id, auth.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.code === "ZONE_IN_USE") {
      return NextResponse.json({ error: error.message, code: "ZONE_IN_USE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
