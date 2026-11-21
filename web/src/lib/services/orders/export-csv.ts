import { Order } from "@/lib/db/models/order";
import { ActivityLog } from "@/lib/db/models/activityLog";
import { connectDb } from "@/lib/db/connect";

export async function exportOrdersCSV(query: any, actor?: any) {
  await connectDb();

  const filter: any = {};
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = query.dateFrom;
    if (query.dateTo) filter.createdAt.$lte = query.dateTo;
  }
  if (query.status) {
    filter.status = query.status;
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

  const headers = [
    "Order Number",
    "Date",
    "Customer Name",
    "Customer Email",
    "Customer Phone",
    "Status",
    "Payment Status",
    "Delivery Method",
    "Delivery Zone",
    "Subtotal",
    "Delivery Fee",
    "Discount",
    "Total",
    "Item Count",
  ];

  const rows = orders.map((order: any) => {
    const itemCount = Array.isArray(order.items)
      ? order.items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0)
      : 0;
    return [
      order.orderNumber || order._id.toString(),
      order.createdAt ? new Date(order.createdAt).toISOString() : "",
      order.customer?.name || "",
      order.customer?.email || "",
      order.customer?.phone || "",
      order.status || "",
      order.paymentStatus || "",
      order.deliveryMethod || "",
      order.deliveryZoneName || "",
      order.subtotal || 0,
      order.deliveryFee || 0,
      order.discount || 0,
      order.total || 0,
      itemCount,
    ];
  });

  const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");

  if (actor?.userId) {
    try {
      await ActivityLog.create({
        userId: actor.userId,
        action: "orders.export.csv",
        entity: { type: "order", id: "export" },
        after: { count: orders.length },
      });
    } catch (e) {}
  }

  return csvContent;
}
