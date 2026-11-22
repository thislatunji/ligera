import { NextResponse } from "next/server";
import { createIpRateLimiter } from "@/lib/api/rate-limit";
import { verifyPublicOrderPaymentStatus } from "@/lib/services/checkout/verify-order-payment";

const ORDER_NUMBER_REGEX = /^LG-\d{6}$/;
const isRateLimited = createIpRateLimiter({ windowMs: 60 * 1000, max: 30 });

export async function GET(
  req: Request,
  context: { params: Promise<{ orderNumber: string }> }
) {
  try {
    if (isRateLimited(req)) {
      return NextResponse.json(
        { error: "Too many verification requests. Please wait a moment.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const { orderNumber } = await Promise.resolve(context.params);
    if (!ORDER_NUMBER_REGEX.test(orderNumber || "")) {
      return NextResponse.json(
        { error: "Invalid order number.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const transactionId = new URL(req.url).searchParams.get("transaction_id");
    const result = await verifyPublicOrderPaymentStatus(orderNumber, transactionId);
    if (!result) {
      return NextResponse.json(
        { error: "Order not found.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Something went wrong.", code: "ERROR" },
      { status: 500 }
    );
  }
}
