import { Order } from "@/lib/db/models/order";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import type { ActorContext } from "@/lib/api/types/orders";

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
  "abandoned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Normative transition matrix from README §3.3
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "abandoned", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: ["refunded"],
  refunded: [],
  abandoned: [],
};

export const TRANSITION_MATRIX = ALLOWED_TRANSITIONS;

export class TransitionError extends Error {
  code: string;
  from?: string;
  to?: string;
  constructor(message: string, code = "INVALID_TRANSITION", from?: string, to?: string) {
    super(message);
    this.name = "TransitionError";
    this.code = code;
    this.from = from;
    this.to = to;
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function getAllowedFromForTo(to: OrderStatus): OrderStatus[] {
  const froms: OrderStatus[] = [];
  for (const [from, allowed] of Object.entries(ALLOWED_TRANSITIONS)) {
    if ((allowed as OrderStatus[]).includes(to)) {
      froms.push(from as OrderStatus);
    }
  }
  return froms;
}

export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  actor: ActorContext,
  opts?: { note?: string; emailCustomer?: boolean }
) {
  const allowedFroms = getAllowedFromForTo(to);
  if (allowedFroms.length === 0) {
    throw new TransitionError(`You can't move to ${to}.`, "INVALID_TRANSITION");
  }

  // Find order first to get previous status for logging
  const existingOrder = await Order.findById(orderId);
  if (!existingOrder) {
    throw new TransitionError("Order not found.", "NOT_FOUND");
  }

  if (!canTransition(existingOrder.status as OrderStatus, to)) {
    throw new TransitionError(
      `You can't move a ${existingOrder.status} order to ${to}.`,
      "INVALID_TRANSITION",
      existingOrder.status,
      to
    );
  }

  const previousStatus = existingOrder.status;

  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: existingOrder.status },
    {
      status: to,
      $push: {
        statusTimeline: {
          status: to,
          at: new Date(),
          byUserId: actor.userId,
          note: opts?.note ?? "",
        },
      },
    },
    { new: true }
  );

  if (!order) {
    throw new TransitionError(
      `You can't move a ${previousStatus} order to ${to}.`,
      "INVALID_TRANSITION",
      previousStatus,
      to
    );
  }

  if (opts?.emailCustomer !== false) {
    try {
      await enqueueNotification("order.status.customer", { orderId: order._id, status: to });
    } catch (e) {
      // Don't fail transition if notification fails
    }
  }

  try {
    await ActivityLog.create({
      userId: actor.userId,
      action: `order.status.${to}`,
      entity: { type: "order", id: orderId.toString() },
      before: { status: previousStatus },
      after: { status: to },
    });
  } catch (e) {
    // Don't fail transition if logging fails
  }

  return order;
}
