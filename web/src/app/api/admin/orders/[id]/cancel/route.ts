import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { CancelInput } from "@/lib/api/schemas/orders";
import { cancelOrder } from "@/lib/services/orders/cancel";
import { TransitionError } from "@/lib/services/orders/transition";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireAuth(request, ["owner", "staff"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const parsed = CancelInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }

    const result = await cancelOrder(id, auth, parsed.data);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof TransitionError || error.code === "INVALID_TRANSITION") {
      return NextResponse.json(
        { error: error.message || "You can't make this transition.", code: "INVALID_TRANSITION", from: error.from, to: error.to },
        { status: 409 }
      );
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Order not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
