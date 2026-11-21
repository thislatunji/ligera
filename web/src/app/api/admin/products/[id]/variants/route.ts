import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { addVariant } from "@/lib/services/catalog/admin";
import { VariantInput } from "@/lib/api/schemas/catalog";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = VariantInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const result = await addVariant(params.id, parsed.data, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.code === "SKU_TAKEN") {
      return NextResponse.json({ error: error.message, code: "SKU_TAKEN" }, { status: 409 });
    }
    if (error.code === "VARIANT_IN_USE") {
      return NextResponse.json({ error: "This variant is on existing orders — deactivate it instead.", code: "VARIANT_IN_USE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
