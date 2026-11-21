import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { QuoteRequest } from "@/lib/api/schemas/checkout";
import { getQuote } from "@/lib/services/checkout/quote";

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = await req.json();
    const parsed = QuoteRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request.", code: "VALIDATION_ERROR", details: parsed.error.issues }, { status: 400 });
    }
    try {
      const quote = await getQuote(parsed.data);
      return NextResponse.json(quote, { status: 200 });
    } catch (err: any) {
      if (err.code === "ITEM_UNAVAILABLE") {
        return NextResponse.json({ error: err.message || "Item unavailable.", code: "ITEM_UNAVAILABLE", items: err.items }, { status: 409 });
      }
      if (err.code === "ZONE_INVALID") {
        return NextResponse.json({ error: err.message || "Choose a delivery zone.", code: "ZONE_INVALID" }, { status: 422 });
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong.", code: "ERROR" }, { status: 500 });
  }
}
