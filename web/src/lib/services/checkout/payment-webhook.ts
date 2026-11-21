import { Payment } from "@/lib/db/models/payment";
import { Order } from "@/lib/db/models/order";
import { Variant } from "@/lib/db/models/variant";
import { Product } from "@/lib/db/models/product";
import { StockAdjustment } from "@/lib/db/models/stockAdjustment";
import { verifyTransaction } from "@/lib/integrations/flutterwave";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import { handleCustomRequestPayment } from "@/lib/services/custom-requests/payment-branch";

function stripCardFields(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const stripped: any = Array.isArray(obj) ? [] : {};
  const sensitive = ["card", "pan", "cvv", "expiry", "card_number", "cardbin"];
  for (const key of Object.keys(obj)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      continue;
    }
    if (typeof obj[key] === "object") {
      stripped[key] = stripCardFields(obj[key]);
    } else {
      stripped[key] = obj[key];
    }
  }
  return stripped;
}

export async function handleFlutterwaveWebhook(body: any, signature: string | null) {
  const secretHash = process.env.FLW_SECRET_HASH;
  if (!secretHash || signature !== secretHash) {
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
    } catch (err) {
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

  // Re-verify
  try {
    const verified = await verifyTransaction(body.data.id);
    const verifiedStatus = verified?.status;
    const verifiedAmount = verified?.amount;
    const verifiedCurrency = verified?.currency || "NGN";

    if (verifiedAmount !== order.total || verifiedCurrency !== "NGN") {
      await enqueueNotification("payment.mismatch.owner", {
        orderNumber: order.orderNumber,
        tx_ref: txRef,
        amount: verifiedAmount,
        expected: order.total,
      });
      return { ok: true };
    }

    if (verifiedStatus === "successful" || body.data.status === "successful") {
      // Try to commit - exactly once via status guard
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, status: "pending_payment" },
        {
          status: "paid",
          paymentStatus: "successful",
          verifiedAt: new Date(),
          $push: { statusTimeline: { status: "paid", at: new Date() } },
        },
        { new: true }
      );
      if (!updatedOrder) {
        // Already processed
        return { ok: true };
      }

      // Commit stock for each item
      const items = updatedOrder.items || order.items || [];
      for (const item of items as any[]) {
        const variant = await Variant.findById(item.variantId);
        if (variant) {
          await Variant.findByIdAndUpdate(item.variantId, {
            $inc: { stockQty: -(item.qty || 0), heldQty: -(item.qty || 0) },
          });
          try {
            await StockAdjustment.create({
              variantId: item.variantId,
              qty: -(item.qty || 0),
              delta: -(item.qty || 0),
              change: -(item.qty || 0),
              reason: "order_paid",
              orderId: updatedOrder._id.toString(),
              productId: item.productId,
            });
          } catch (e) {
            console.error("stock adj error", e);
          }
          if (item.productId) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { popularity: item.qty || 0 } });
          }
          const updatedVariant = await Variant.findById(item.variantId).lean();
          const available = updatedVariant ? Math.max(0, ((updatedVariant as any).stockQty || 0) - ((updatedVariant as any).heldQty || 0)) : 0;
          if (available <= ((updatedVariant as any)?.lowStockThreshold || 5)) {
            await enqueueNotification("stock.low.owner", {
              variantId: item.variantId,
              productId: item.productId,
              available,
            });
          }
        }
      }

      await Payment.findOneAndUpdate(
        { _id: payment._id },
        {
          status: "successful",
          verifiedAt: new Date(),
          rawEvent: stripCardFields(body),
        }
      );

      // Enqueue emails
      await enqueueNotification("order.paid.customer", { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber });
      await enqueueNotification("order.paid.owner", { orderId: updatedOrder._id, orderNumber: updatedOrder.orderNumber });

      return { ok: true };
    } else if (verifiedStatus === "failed" || body.data.status === "failed") {
      await Payment.findOneAndUpdate({ _id: payment._id }, { status: "failed" });
      return { ok: true };
    }
  } catch (err: any) {
    if (err.message?.includes("verify failed")) {
      throw err;
    }
    throw err;
  }

  return { ok: true };
}
