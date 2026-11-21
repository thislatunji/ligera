import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { OrderLookupRequest } from "@/lib/api/schemas/checkout";
import { lookupOrder } from "@/lib/services/checkout/lookup";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

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
    const parsed = OrderLookupRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    try {
      const result = await lookupOrder(parsed.data);
      return NextResponse.json(result, { status: 200 });
    } catch (err: any) {
      if (err.code === "NOT_FOUND") {
        return NextResponse.json({ error: err.message || "We couldn't find an order with those details.", code: "NOT_FOUND" }, { status: 404 });
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong.", code: "ERROR" }, { status: 500 });
  }
}
