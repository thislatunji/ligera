import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { updateVariant, deleteVariant } from "@/lib/services/catalog/admin";
import { VariantInput } from "@/lib/api/schemas/catalog";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const result = await updateVariant(params.id, body, auth.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.code === "SKU_TAKEN") {
      return NextResponse.json({ error: error.message, code: "SKU_TAKEN" }, { status: 409 });
    }
    if (error.code === "VARIANT_IN_USE") {
      return NextResponse.json({ error: "This variant is on existing orders — deactivate it instead.", code: "VARIANT_IN_USE" }, { status: 409 });
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "We couldn't find that variant.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await deleteVariant(params.id, auth.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.code === "VARIANT_IN_USE") {
      return NextResponse.json({ error: "This variant is on existing orders — deactivate it instead.", code: "VARIANT_IN_USE" }, { status: 409 });
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "We couldn't find that variant.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
