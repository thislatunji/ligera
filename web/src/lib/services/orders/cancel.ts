import { Order } from "@/lib/db/models/order";
import { Variant } from "@/lib/db/models/variant";
import { StockAdjustment } from "@/lib/db/models/stockAdjustment";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import { transitionOrder, TransitionError } from "./transition";
import type { ActorContext } from "@/lib/api/types/orders";

export async function cancelOrder(
  orderId: string,
  actor: ActorContext,
  input: { reason: string; restoreStock?: boolean }
) {
  const order: any = await Order.findById(orderId);
  if (!order) {
    throw new TransitionError("Order not found.", "NOT_FOUND");
  }

  const restore =
    input.restoreStock !== undefined ? input.restoreStock : order.restoreStockOnCancel !== false;

  // For pending_payment, we need to release holds
  if (order.status === "pending_payment") {
    // Release heldQty for items
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.variantId) {
          try {
            await Variant.findByIdAndUpdate(item.variantId, {
              $inc: { heldQty: -(item.qty || 0) },
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }
    try {
      await transitionOrder(orderId, "cancelled" as any, actor, { note: input.reason });
    } catch (e) {
      throw e;
    }
    try {
      await enqueueNotification("order.cancelled.customer", { orderId: order._id, reason: input.reason });
    } catch (e) {}
    try {
      await ActivityLog.create({
        userId: actor.userId,
        action: "order.cancelled",
        entity: { type: "order", id: orderId },
        before: { status: order.status },
        after: { status: "cancelled" },
      });
    } catch (e) {}
    return { id: orderId, status: "cancelled", restoredStock: false };
  }

  // For paid/processing/ready_for_pickup/out_for_delivery
  if (["paid", "processing", "ready_for_pickup", "out_for_delivery"].includes(order.status)) {
    if (restore && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.variantId) {
          try {
            await Variant.findByIdAndUpdate(item.variantId, {
              $inc: { stockQty: +(item.qty || 0) },
            });
            await StockAdjustment.create({
              variantId: item.variantId,
              qty: item.qty || 0,
              reason: "order_cancelled",
              orderId: orderId,
              actorId: actor.userId,
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }
    try {
      await transitionOrder(orderId, "cancelled" as any, actor, { note: input.reason });
    } catch (e) {
      throw e;
    }
    try {
      await enqueueNotification("order.cancelled.customer", { orderId: order._id, reason: input.reason });
    } catch (e) {}
    return { id: orderId, status: "cancelled", restoredStock: restore };
  }

  throw new TransitionError(`You can't move a ${order.status} order to cancelled.`, "INVALID_TRANSITION", order.status, "cancelled");
}
