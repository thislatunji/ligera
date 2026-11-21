import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { RefundInput } from "@/lib/api/schemas/orders";
import { refundOrder } from "@/lib/services/orders/refund";
import { TransitionError } from "@/lib/services/orders/transition";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) {
    // If it's a 403 from requireAuth due to role, make sure it's AUTH_FORBIDDEN as per spec
    if (auth.status === 403) {
      return NextResponse.json({ error: "Only the owner can refund orders.", code: "AUTH_FORBIDDEN" }, { status: 403 });
    }
    return auth;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = RefundInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }

    const result = await refundOrder(params.id, auth, parsed.data);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.code === "AUTH_FORBIDDEN" || error.status === 403) {
      return NextResponse.json({ error: "Only the owner can refund orders.", code: "AUTH_FORBIDDEN" }, { status: 403 });
    }
    if (error.code === "NOT_PAID" || error.status === 409) {
      return NextResponse.json({ error: "Only paid orders can be refunded.", code: "NOT_PAID" }, { status: 409 });
    }
    if (error.code === "REFUND_EXCEEDED" || error.status === 422) {
      return NextResponse.json({ error: "Refund can't be more than the order total.", code: "REFUND_EXCEEDED" }, { status: 422 });
    }
    if (error.code === "REFUND_FAILED" || error.status === 502) {
      return NextResponse.json({ error: "Flutterwave could not process the refund. Try again shortly.", code: "REFUND_FAILED" }, { status: 502 });
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Order not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
