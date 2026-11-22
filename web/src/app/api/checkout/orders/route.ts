import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { CheckoutRequest } from "@/lib/api/schemas/checkout";
import { createIpRateLimiter } from "@/lib/api/rate-limit";
import { placeOrder } from "@/lib/services/checkout/place-order";

const isRateLimited = createIpRateLimiter({ windowMs: 60 * 1000, max: 10 });

export async function POST(req: Request) {
  try {
    await connectDb();
    if (isRateLimited(req)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = CheckoutRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Please check your checkout details.",
          code: "VALIDATION_ERROR",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }
    if (parsed.data.deliveryMethod === "delivery") {
      if (!parsed.data.address || !parsed.data.zoneId) {
        return NextResponse.json(
          { error: "Choose a delivery zone.", code: "ZONE_INVALID" },
          { status: 422 }
        );
      }
    }
    try {
      const result = await placeOrder(parsed.data);
      return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
      if (err.code === "ITEM_UNAVAILABLE") {
        return NextResponse.json(
          {
            error: err.message || "Item unavailable.",
            code: "ITEM_UNAVAILABLE",
            items: err.items,
          },
          { status: 409 }
        );
      }
      if (err.code === "STOCK_SOLD_OUT") {
        return NextResponse.json(
          {
            error:
              err.message ||
              "Some items just sold out. Please remove it to continue.",
            code: "STOCK_SOLD_OUT",
            items: err.items,
          },
          { status: 409 }
        );
      }
      if (err.code === "ZONE_INVALID") {
        return NextResponse.json(
          { error: err.message || "Choose a delivery zone.", code: "ZONE_INVALID" },
          { status: 422 }
        );
      }
      if (err.code === "PAYMENT_LINK_FAILED") {
        return NextResponse.json(
          {
            error:
              err.message ||
              "We couldn't start your payment. Please try again.",
            code: "PAYMENT_LINK_FAILED",
          },
          { status: 502 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong.", code: "ERROR" },
      { status: 500 }
    );
  }
}
