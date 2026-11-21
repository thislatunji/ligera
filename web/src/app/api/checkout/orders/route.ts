import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { CheckoutRequest } from "@/lib/api/schemas/checkout";
import { placeOrder } from "@/lib/services/checkout/place-order";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export async function POST(req: Request) {
  try {
    await connectDb();
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= RATE_LIMIT_MAX) {
        return NextResponse.json({ error: "Too many attempts. Please wait a moment.", code: "RATE_LIMITED" }, { status: 429 });
      }
      entry.count += 1;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const body = await req.json();
    const parsed = CheckoutRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    if (parsed.data.deliveryMethod === "delivery") {
      if (!parsed.data.address || !parsed.data.zoneId) {
        return NextResponse.json({ error: "Choose a delivery zone.", code: "ZONE_INVALID" }, { status: 422 });
      }
    }
    try {
      const result = await placeOrder(parsed.data);
      return NextResponse.json(result, { status: 201 });
    } catch (err: any) {
      if (err.code === "ITEM_UNAVAILABLE") {
        return NextResponse.json({ error: err.message || "Item unavailable.", code: "ITEM_UNAVAILABLE", items: err.items }, { status: 409 });
      }
      if (err.code === "STOCK_SOLD_OUT") {
        return NextResponse.json({ error: err.message || "Some items just sold out. Please remove it to continue.", code: "STOCK_SOLD_OUT", items: err.items }, { status: 409 });
      }
      if (err.code === "ZONE_INVALID") {
        return NextResponse.json({ error: err.message || "Choose a delivery zone.", code: "ZONE_INVALID" }, { status: 422 });
      }
      if (err.code === "PAYMENT_LINK_FAILED") {
        return NextResponse.json({ error: err.message || "We couldn't start your payment. Please try again.", code: "PAYMENT_LINK_FAILED" }, { status: 502 });
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong.", code: "ERROR" }, { status: 500 });
  }
}
