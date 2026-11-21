import { connectDb } from "@/lib/db/connect";
import { Customer } from "@/lib/db/models/customer";
import { Order } from "@/lib/db/models/order";
import { ActivityLog } from "@/lib/db/models/activityLog";
import mongoose from "mongoose";

const PAID_STATUSES = ["paid", "processing", "shipped", "delivered", "fulfilled", "completed"];

export async function listCustomers(query: any = {}, userId?: string) {
  await connectDb();
  const page = query.page || 1;
  const limit = query.limit || 25;
  const skip = (page - 1) * limit;

  const match: any = {};
  if (query.consentOnly) {
    match.marketingConsent = true;
  }
  if (query.q) {
    const q = query.q.toString();
    match.$or = [
      { email: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
    ];
  }

  const customers = await Customer.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const total = await Customer.countDocuments(match);

  const result = await Promise.all(
    customers.map(async (c: any) => {
      // Aggregate orders for this customer (by customerId or by email in order.customer.email)
      const ordersAgg = await Order.aggregate([
        {
          $match: {
            $and: [
              {
                $or: [
                  { customerId: c._id },
                  { "customer.email": c.email?.toLowerCase?.() },
                ],
              },
              {
                $or: [
                  { status: { $in: [...PAID_STATUSES, "refunded"] } },
                  { paymentStatus: { $in: ["successful", "paid"] } },
                ],
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            totalSpend: { $sum: { $ifNull: ["$total", 0] } },
            lastOrderAt: { $max: "$createdAt" },
          },
        },
      ]);
      const agg = ordersAgg[0] || { orderCount: 0, totalSpend: 0, lastOrderAt: null };
      return {
        id: c._id.toString(),
        name: c.name || "",
        email: c.email || "",
        phone: c.phone || "",
        orderCount: agg.orderCount || 0,
        totalSpend: agg.totalSpend || 0,
        lastOrderAt: agg.lastOrderAt ? (agg.lastOrderAt instanceof Date ? agg.lastOrderAt.toISOString() : agg.lastOrderAt) : undefined,
        marketingConsent: !!c.marketingConsent,
        createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      };
    })
  );

  return { data: result, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function exportCustomersCSV(userId?: string) {
  await connectDb();
  const { data } = await listCustomers({ page: 1, limit: 10000 });
  const header = "name,email,phone,orderCount,totalSpend,marketingConsent,lastOrderAt,createdAt";
  const rows = [header];
  for (const c of data) {
    const row = [
      `"${(c.name || "").replace(/"/g, '""')}"`,
      c.email,
      c.phone,
      c.orderCount,
      c.totalSpend,
      c.marketingConsent,
      c.lastOrderAt || "",
      c.createdAt,
    ].join(",");
    rows.push(row);
  }
  const csv = rows.join("\n");
  if (userId) {
    try {
      await ActivityLog.create({
        userId: new mongoose.Types.ObjectId(userId),
        action: "customers.export",
        entity: { type: "customers", id: "export" },
        before: null,
        after: { count: data.length },
      });
    } catch (e) {}
  }
  return csv;
}
