import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { Variant } from "@/lib/db/models/variant";
import { StockAdjustment } from "@/lib/db/models/stockAdjustment";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";

export async function commitPaidOrder(orderId: string, paymentData?: any) {
  const order: any = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  if (order.status === "paid") {
    return order;
  }

  // Commit stock: for each item, decrement stockQty and heldQty as per paid commit
  if (Array.isArray(order.items)) {
    for (const item of order.items) {
      if (item.variantId) {
        try {
          await Variant.findByIdAndUpdate(item.variantId, {
            $inc: { stockQty: -(item.qty || 0), heldQty: -(item.qty || 0) },
          });
          await StockAdjustment.create({
            variantId: item.variantId,
            qty: -(item.qty || 0),
            reason: "order_paid",
            orderId: orderId,
          });
        } catch (e) {
          // Continue even if stock operations fail
        }
      }
    }
  }

  // Update payment
  try {
    const payment = await Payment.findOne({ orderId: order._id }) || await Payment.findOne({ reference: order.orderNumber });
    if (payment) {
      payment.status = "successful";
      payment.verifiedAt = new Date();
      await payment.save();
    }
  } catch (e) {}

  order.status = "paid";
  order.paymentStatus = "successful";
  if (!order.statusTimeline) order.statusTimeline = [];
  order.statusTimeline.push({
    status: "paid",
    at: new Date(),
    byUserId: null,
    note: "Payment verified",
  });
  await order.save();

  try {
    await enqueueNotification("order.paid.customer", { orderId: order._id });
    await enqueueNotification("order.paid.owner", { orderId: order._id });
  } catch (e) {}

  try {
    await ActivityLog.create({
      userId: order.customerId || null,
      action: "order.paid",
      entity: { type: "order", id: orderId },
      before: { status: "pending_payment" },
      after: { status: "paid" },
    });
  } catch (e) {}

  return order;
}

export const paidCommit = commitPaidOrder;
export default commitPaidOrder;
