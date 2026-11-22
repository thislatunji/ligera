import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getOrderDetail } from "@/lib/services/orders/detail";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireAuth(request, ["owner", "staff"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await Promise.resolve(params);
    const order = await getOrderDetail(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
