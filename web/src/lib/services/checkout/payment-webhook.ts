import { timingSafeEqual } from "node:crypto";
import { Payment } from "@/lib/db/models/payment";
import { Order } from "@/lib/db/models/order";
import { verifyTransaction } from "@/lib/integrations/flutterwave";
import { handleCustomRequestPayment } from "@/lib/services/custom-requests/payment-branch";
import { applyVerifiedPayment } from "@/lib/services/checkout/verify-order-payment";

function isValidWebhookSignature(
  signature: string | null,
  secretHash: string | undefined
): boolean {
  if (!secretHash || !signature) return false;
  const sigBuf = Buffer.from(signature);
  const secretBuf = Buffer.from(secretHash);
  if (sigBuf.length !== secretBuf.length) return false;
  return timingSafeEqual(sigBuf, secretBuf);
}

export async function handleFlutterwaveWebhook(body: any, signature: string | null) {
  const secretHash = process.env.FLW_SECRET_HASH;
  if (!isValidWebhookSignature(signature, secretHash)) {
    const err: any = new Error("Invalid signature.");
    err.code = "WEBHOOK_INVALID";
    err.status = 401;
    throw err;
  }

  // Validate shape is basic
  if (!body?.data?.tx_ref) {
    return { ok: true };
  }

  const txRef = body.data.tx_ref;
  if (typeof txRef === "string" && txRef.startsWith("CR-")) {
    try {
      return await handleCustomRequestPayment(body);
    } catch {
      // Be defensive like the route expects
      return { ok: true };
    }
  }

  const payment = await Payment.findOne({ reference: txRef });
  if (!payment) {
    return { ok: true };
  }
  const order = await Order.findById(payment.orderId);
  if (!order) {
    return { ok: true };
  }

  // Idempotency
  if (payment.status === "successful" && order.status !== "pending_payment") {
    return { ok: true };
  }

  // Re-verify transaction server-side; never trust unverified webhook payload status
  const verified = await verifyTransaction(body.data.id);
  await applyVerifiedPayment(order, payment, verified, body);

  return { ok: true };
}
