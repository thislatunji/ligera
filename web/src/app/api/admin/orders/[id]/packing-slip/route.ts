import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getOrderDetail } from "@/lib/services/orders/detail";
import { renderPackingSlip } from "@/lib/services/orders/packing-slip";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner", "staff"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const order = await getOrderDetail(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    const html = renderPackingSlip(order);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
