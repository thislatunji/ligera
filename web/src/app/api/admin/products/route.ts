import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { createProduct, listAdminProducts } from "@/lib/services/catalog/admin";
import { ProductUpsert } from "@/lib/api/schemas/catalog";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner", "staff"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const query: any = {};
    for (const [key, value] of searchParams.entries()) {
      query[key] = value;
    }
    const result = await listAdminProducts(query, auth.role);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = ProductUpsert.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const result = await createProduct(parsed.data, auth.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.code === "SKU_TAKEN") {
      return NextResponse.json({ error: error.message, code: "SKU_TAKEN" }, { status: 409 });
    }
    if (error.code === "VALIDATION_ERROR") {
      return NextResponse.json({ error: error.message || "Validation failed.", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
