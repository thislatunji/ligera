import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { AdminOrderQuery } from "@/lib/api/schemas/orders";
import { listOrders } from "@/lib/services/orders/list";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ["owner", "staff"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const query: any = {};
    for (const [key, value] of searchParams.entries()) {
      query[key] = value;
    }

    const parsed = AdminOrderQuery.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }

    const result = await listOrders(parsed.data);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
