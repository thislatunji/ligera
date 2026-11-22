import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { adjustStock } from "@/lib/services/catalog/stock";
import { StockAdjustmentInput } from "@/lib/api/schemas/catalog";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireAuth(request, ["owner", "staff"]);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const parsed = StockAdjustmentInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const result = await adjustStock(id, parsed.data, auth.userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.code === "STOCK_NEGATIVE") {
      return NextResponse.json({ error: "Stock can't go below zero.", code: "STOCK_NEGATIVE" }, { status: 422 });
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "We couldn't find that variant.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong on our side.", code: "INTERNAL" }, { status: 500 });
  }
}
