import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import { transitionOrder, TransitionError } from "./transition";
import { refundTransaction } from "@/integrations/flutterwave";
import type { ActorContext } from "@/lib/api/types/orders";

export async function refundOrder(
  orderId: string,
  actor: ActorContext,
  input: { amount?: number; note?: string } = {}
) {
  const order: any = await Order.findById(orderId);
  if (!order) {
    throw new TransitionError("Order not found.", "NOT_FOUND");
  }

  if (order.paymentStatus !== "successful" && order.status !== "paid") {
    // Also check if it's been paid
    if (!(order.status === "paid" || order.paymentStatus === "successful")) {
      throw Object.assign(new Error("Only paid orders can be refunded."), { code: "NOT_PAID", status: 409 });
    }
  }

  const total = order.total || 0;
  const refundAmount = input.amount !== undefined ? input.amount : total;

  if (refundAmount > total) {
    throw Object.assign(new Error("Refund can't be more than the order total."), { code: "REFUND_EXCEEDED", status: 422 });
  }

  // Cancel first if not cancelled? Or transition to cancelled then refunded? Matrix says cancelled -> refunded (owner)
  if (order.status !== "cancelled") {
    try {
      await transitionOrder(orderId, "cancelled" as any, actor, { note: input.note || "Cancelled for refund" });
    } catch (e) {
      // If can't transition to cancelled, maybe try to force? But follow matrix
      throw e;
    }
  }

  const payment = await Payment.findOne({ orderId: order._id }) || await Payment.findOne({ reference: order.orderNumber });
  const txRef = payment?.reference || order.orderNumber || order.externalRef;

  let refundResult;
  try {
    refundResult = await refundTransaction(txRef, refundAmount);
  } catch (e: any) {
    throw Object.assign(new Error("Flutterwave could not process the refund. Try again shortly."), { code: "REFUND_FAILED", status: 502 });
  }

  if (!refundResult || refundResult.success === false) {
    throw Object.assign(new Error("Flutterwave could not process the refund. Try again shortly."), { code: "REFUND_FAILED", status: 502 });
  }

  if (payment) {
    payment.status = "refunded";
    await payment.save();
  }

  try {
    await Order.findByIdAndUpdate(orderId, { paymentStatus: "refunded" });
  } catch (e) {}

  try {
    await transitionOrder(orderId, "refunded" as any, actor, { note: input.note || `Refunded ${refundAmount}` });
  } catch (e) {
    // If already in right state or can't transition, try direct update
    await Order.findByIdAndUpdate(orderId, { status: "refunded" });
  }

  try {
    await enqueueNotification("order.refunded.customer", { orderId: order._id, amount: refundAmount, note: input.note });
    await enqueueNotification("order.cancelled.customer", { orderId: order._id, amount: refundAmount, reason: input.note });
  } catch (e) {}

  try {
    await ActivityLog.create({
      userId: actor.userId,
      action: "order.refunded",
      entity: { type: "order", id: orderId },
      before: { status: order.status },
      after: { status: "refunded", refundAmount },
    });
  } catch (e) {}

  return { id: orderId, status: "refunded", refundAmount };
}
