import { Order } from "@/lib/db/models/order";

export async function lookupOrder({ orderNumber, email, phone }: { orderNumber: string; email?: string; phone?: string }) {
  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) {
    const err: any = new Error("We couldn't find an order with those details.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const orderEmail = (order.customer?.email || "").toLowerCase();
  const orderPhone = order.customer?.phone || "";

  let match = false;
  if (email && orderEmail === email.toLowerCase()) {
    match = true;
  }
  if (!match && phone && orderPhone === phone) {
    match = true;
  }
  if (!match && phone && orderPhone.replace(/\D/g, "") === phone.replace(/\D/g, "")) {
    match = true;
  }

  if (!match) {
    const err: any = new Error("We couldn't find an order with those details.");
    err.code = "NOT_FOUND";
    throw err;
  }

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus || "pending",
    items: (order.items || []).map((i: any) => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    expectedDeliveryWindow: order.expectedDeliveryWindow || "",
    placedAt: order.createdAt ? (order.createdAt instanceof Date ? order.createdAt.toISOString() : new Date(order.createdAt).toISOString()) : new Date().toISOString(),
    giftNote: order.giftNote,
  };
}
