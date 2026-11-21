import { Order } from "@/lib/db/models/order";
import { User } from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/connect";

export async function getOrderDetail(orderIdOrNumber: string) {
  await connectDb();

  const query = orderIdOrNumber.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: orderIdOrNumber }
    : { orderNumber: orderIdOrNumber };

  const order: any = await Order.findOne(query).lean();
  if (!order) {
    return null;
  }

  // Enrich timeline with actor names
  const timeline = Array.isArray(order.statusTimeline) ? order.statusTimeline : [];
  const userIds = timeline.map((t: any) => t.byUserId).filter(Boolean);
  const users = userIds.length > 0 ? await User.find({ _id: { $in: userIds } }).lean() : [];
  const userMap = new Map(users.map((u: any) => [u._id.toString(), u.name]));

  const enrichedTimeline = timeline.map((t: any) => ({
    status: t.status,
    at: t.at ? new Date(t.at).toISOString() : new Date().toISOString(),
    byUserName: t.byUserId ? userMap.get(t.byUserId.toString()) : undefined,
    note: t.note,
  }));

  const giftOrder = !!(order.giftNote || order.hidePrices);
  const needsAction = order.status === "paid";

  const items = Array.isArray(order.items)
    ? order.items.map((item: any) => ({
        name: item.name || "",
        sku: item.sku || "",
        label: item.label || item.name || "",
        unitPrice: item.unitPrice || 0,
        qty: item.qty || 0,
        imageUrl: item.imageUrl || "",
      }))
    : [];

  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber || order._id.toString(),
    customer: {
      name: order.customer?.name || "",
      email: order.customer?.email || "",
      phone: order.customer?.phone || "",
    },
    status: order.status,
    paymentStatus: order.paymentStatus || "pending",
    deliveryZoneName: order.deliveryZoneName,
    deliveryMethod: order.deliveryMethod || "delivery",
    itemCount: items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0),
    total: order.total || 0,
    placedAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: order.updatedAt ? order.updatedAt.toISOString() : new Date().toISOString(),
    giftOrder,
    needsAction,
    items,
    subtotal: order.subtotal || 0,
    deliveryFee: order.deliveryFee || 0,
    discount: order.discount || 0,
    deliveryAddress: order.deliveryAddress,
    giftNote: order.giftNote,
    hidePrices: !!order.hidePrices,
    payment: order.payment || {
      reference: order.externalRef || order.orderNumber || "",
      amount: order.total || 0,
      status: order.paymentStatus || "pending",
    },
    statusTimeline: enrichedTimeline,
    internalNotes: Array.isArray(order.internalNotes) ? order.internalNotes : [],
    restoreStockOnCancel: order.restoreStockOnCancel !== false,
    source: order.source || "storefront",
    expectedDeliveryWindow: order.expectedDeliveryWindow || "",
  };
}
