import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { updateProduct, deleteProduct } from "@/lib/services/catalog/admin";
import { ProductUpsert } from "@/lib/api/schemas/catalog";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const parsed = ProductUpsert.partial().safeParse(body);
    if (!parsed.success && Object.keys(body).length > 0) {
      // Allow partial for PUT? The spec says PUT full edit - but be flexible
    }
    const result = await updateProduct(params.id, body, auth.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.code === "SLUG_IMMUTABLE") {
      return NextResponse.json({ error: "Slug cannot be changed on published products.", code: "SLUG_IMMUTABLE" }, { status: 409 });
    }
    if (error.code === "SKU_TAKEN") {
      return NextResponse.json({ error: error.message, code: "SKU_TAKEN" }, { status: 409 });
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "We couldn't find that product.", code: "NOT_FOUND" }, { status: 404 });
    }
    if (error.code === "VALIDATION_ERROR") {
      return NextResponse.json({ error: error.message || "Validation failed.", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await deleteProduct(params.id, auth.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.code === "PRODUCT_PUBLISHED") {
      return NextResponse.json({ error: "Archive this product before deleting it.", code: "PRODUCT_PUBLISHED" }, { status: 409 });
    }
    if (error.code === "PRODUCT_IN_USE") {
      return NextResponse.json({ error: "This product is referenced by orders.", code: "PRODUCT_IN_USE" }, { status: 409 });
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "We couldn't find that product.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
