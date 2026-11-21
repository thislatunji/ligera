import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { FlutterwaveWebhook } from "@/lib/api/schemas/checkout";
import { handleFlutterwaveWebhook } from "@/lib/services/checkout/payment-webhook";

export async function POST(req: Request) {
  try {
    await connectDb();
    const signature = req.headers.get("verif-hash") || req.headers.get("Verif-Hash");
    const body = await req.json();
    const parsed = FlutterwaveWebhook.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request.", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    try {
      await handleFlutterwaveWebhook(parsed.data, signature);
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err: any) {
      if (err.code === "WEBHOOK_INVALID" || err.status === 401) {
        return NextResponse.json({ error: err.message || "Invalid signature.", code: "WEBHOOK_INVALID" }, { status: 401 });
      }
      if (err.message?.includes("verify failed") || err.message?.includes("Flutterwave verify")) {
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
      }
      throw err;
    }
  } catch (error: any) {
    if (error.code === "WEBHOOK_INVALID") {
      return NextResponse.json({ error: error.message || "Invalid signature.", code: "WEBHOOK_INVALID" }, { status: 401 });
    }
    return NextResponse.json({ ok: true }, { status: 200 }); // be defensive per idempotency
  }
}
