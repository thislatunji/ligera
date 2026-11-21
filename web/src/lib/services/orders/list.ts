import { Order } from "@/lib/db/models/order";
import { User } from "@/lib/db/models/user";
import { connectDb } from "@/lib/db/connect";

export async function listOrders(query: any) {
  await connectDb();

  const {
    status,
    paymentStatus,
    zoneId,
    dateFrom,
    dateTo,
    q,
    view,
    page = 1,
    limit = 25,
  } = query;

  const filter: any = {};

  if (status) {
    filter.status = status;
  }
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }
  if (zoneId) {
    filter.deliveryZoneId = zoneId;
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = dateFrom;
    if (dateTo) filter.createdAt.$lte = dateTo;
  }

  if (view === "actionable") {
    filter.status = "paid";
  } else if (view === "failed_abandoned") {
    filter.$or = [
      { status: "abandoned" },
      { paymentStatus: { $in: ["failed"] } },
    ];
    if (filter.status && view === "failed_abandoned") {
      // Keep both conditions? The spec says "abandoned + pending/failed payments"
      delete filter.status;
      filter.$or = [{ status: "abandoned" }, { paymentStatus: { $in: ["pending", "failed"] } }];
    } else {
      filter.$or = [{ status: "abandoned" }, { paymentStatus: { $in: ["pending", "failed"] } }];
    }
  }

  if (q && q.trim()) {
    const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = filter.$or
      ? [...filter.$or, { orderNumber: searchRegex }, { "customer.name": searchRegex }, { "customer.phone": searchRegex }]
      : [{ orderNumber: searchRegex }, { "customer.name": searchRegex }, { "customer.phone": searchRegex }];
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  const data = orders.map((order: any) => {
    const giftOrder = !!(order.giftNote || order.hidePrices);
    const needsAction = order.status === "paid";
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
      itemCount: Array.isArray(order.items) ? order.items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0) : (order.items?.length || 0),
      total: order.total || 0,
      placedAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: order.updatedAt ? order.updatedAt.toISOString() : new Date().toISOString(),
      giftOrder,
      needsAction,
    };
  });

  return {
    data,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
