import { connectDb } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/order";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { CustomRequest } from "@/lib/db/models/customRequest";
import type { DashboardSnapshot } from "@/lib/api/types/admin";

const WAT_TZ = "Africa/Lagos";

function getWATParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: WAT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return {
    year: parseInt(get("year")),
    month: parseInt(get("month")),
    day: parseInt(get("day")),
    hour: parseInt(get("hour")),
    minute: parseInt(get("minute")),
    second: parseInt(get("second")),
  };
}

function startOfWATDay(date: Date) {
  const p = getWATParts(date);
  // Create a date representing start of day in WAT by constructing
  // Use UTC approximation by finding midnight in WAT
  const s = new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0));
  // Adjust for WAT offset roughly (WAT is UTC+1)
  // More accurately, we can use a known approach: get start by formatting
  // For simplicity in tests, also try to compute
  // Get midnight in WAT as UTC time
  const utcMidnight = new Date(Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0));
  // WAT is UTC+1, so midnight WAT is 23:00 previous day UTC in winter? Or 00:00Z+1 means 23:00Z previous day? UTC+1 means 00:00 WAT = 23:00 UTC previous day
  // But easier to just compute: create date at 00:00 local in terms of WAT by using Intl to guide
  // Alternatively, just set to start of day by iterating
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - 60 * 60 * 1000); // rough adjustment for WAT UTC+1
}

function getWATDayRange(date: Date) {
  const p = getWATParts(date);
  // Midnight WAT on this date is 23:00 UTC previous day? No, UTC+1: 00:00 WAT = 23:00 UTC (previous day). Or 01:00 UTC.
  // Better: construct by getting the timestamp for midnight in Lagos
  // Use a simple approach: start at 00:00 in WAT
  const start = new Date(`${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T00:00:00+01:00`);
  // If that gives wrong offset in some cases, try to be flexible
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function getPeriodRange(period: "today" | "7d" | "30d", now: Date = new Date()) {
  if (period === "today") {
    const { start, end } = getWATDayRange(now);
    const prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevEnd = start;
    return { start, end, prevStart, prevEnd };
  }
  if (period === "7d") {
    const { start } = getWATDayRange(now);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // end of today/start of tomorrow in our range? or up to now? spec says window for period
    const periodStart = new Date(start.getTime() - 6 * 24 * 60 * 60 * 1000); // last 7 days including today?
    const prevStart = new Date(periodStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevEnd = periodStart;
    return { start: periodStart, end, prevStart, prevEnd };
  }
  if (period === "30d") {
    const { start } = getWATDayRange(now);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const periodStart = new Date(start.getTime() - 29 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(periodStart.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prevEnd = periodStart;
    return { start: periodStart, end, prevStart, prevEnd };
  }
  throw new Error("Invalid period");
}

const PAID_STATUSES = ["paid", "processing", "shipped", "delivered", "fulfilled", "completed"];

function buildPaidMatch(start: Date, end: Date) {
  return {
    $and: [
      {
        $or: [
          { paidAt: { $gte: start, $lt: end } },
          { createdAt: { $gte: start, $lt: end }, status: { $in: PAID_STATUSES } },
          { updatedAt: { $gte: start, $lt: end }, status: { $in: PAID_STATUSES } },
        ],
      },
      {
        $or: [
          { status: { $in: [...PAID_STATUSES, "refunded"] } },
          { paymentStatus: { $in: ["successful", "paid"] } },
        ],
      },
    ],
  };
}

export async function getDashboardSnapshot(period: "today" | "7d" | "30d" = "today"): Promise<DashboardSnapshot> {
  await connectDb();
  const now = new Date();
  const range = getPeriodRange(period, now);

  // Headline
  const headlineAgg = async (start: Date, end: Date) => {
    const match = buildPaidMatch(start, end);
    const res = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $ifNull: ["$total", 0] } },
          count: { $sum: 1 },
        },
      },
    ]);
    const revenue = res[0]?.revenue || 0;
    const count = res[0]?.count || 0;
    const aov = count === 0 ? 0 : Math.round(revenue / count);
    return { revenue, count, aov };
  };

  const [cur, prev] = await Promise.all([headlineAgg(range.start, range.end), headlineAgg(range.prevStart, range.prevEnd)]);

  // Action list
  const [ordersAwaitingProcessing, customRequestsNew, failedOrAbandonedPayments] = await Promise.all([
    Order.countDocuments({ status: "paid" }),
    CustomRequest ? CustomRequest.countDocuments({ status: "new" }).catch(() => 0) : Promise.resolve(0),
    Order.countDocuments({
      $or: [
        { status: "abandoned" },
        { status: "pending_payment", paymentStatus: { $in: ["pending", "failed"] } },
      ],
    }),
  ]);

  // Top products
  const topProductsAgg = await Order.aggregate([
    { $match: buildPaidMatch(range.start, range.end) },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        unitsSold: { $sum: { $ifNull: ["$items.quantity", 1] } },
        revenue: { $sum: { $ifNull: ["$items.lineTotal", { $multiply: ["$items.price", { $ifNull: ["$items.quantity", 1] }] }] } },
      },
    },
    { $sort: { unitsSold: -1, revenue: -1 } },
    { $limit: 5 },
  ]);

  const topProducts = await Promise.all(
    topProductsAgg.map(async (tp: any) => {
      const pid = tp._id?.toString();
      const product = await Product.findById(pid).lean();
      return {
        productId: pid,
        name: product?.name || "Unknown",
        slug: product?.slug || "",
        unitsSold: tp.unitsSold || 0,
        revenue: tp.revenue || 0,
      };
    })
  );

  // Revenue by category
  const revenueByCategoryAgg = await Order.aggregate([
    { $match: buildPaidMatch(range.start, range.end) },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$product.categoryId",
        revenue: { $sum: { $ifNull: ["$items.lineTotal", { $multiply: ["$items.price", { $ifNull: ["$items.quantity", 1] }] }] } },
      },
    },
  ]);

  const revenueByCategory = await Promise.all(
    revenueByCategoryAgg.map(async (rc: any) => {
      const catId = rc._id?.toString();
      let name = "Uncategorized";
      if (rc._id) {
        try {
          const Category = (await import("@/lib/db/models/category")).Category;
          const cat = await Category.findById(rc._id).lean();
          if (cat?.name) name = cat.name;
        } catch (e) {}
      }
      return {
        categoryId: catId || "",
        name,
        revenue: rc.revenue || 0,
      };
    })
  );

  // Low stock
  const lowStock = [] as any[];
  try {
    const variants = await Variant.find({}).populate("productId").lean();
    for (const v of variants as any[]) {
      const product = v.productId || {};
      if (product.madeToOrder) continue;
      const available = (v.stockQty || 0) - (v.heldQty || 0);
      const threshold = v.lowStockThreshold ?? 5;
      if (available <= threshold || available === 0) {
        lowStock.push({
          variantId: v._id.toString(),
          productName: product.name || "",
          label: v.label || "",
          sku: v.sku || "",
          available,
          threshold,
          soldOut: available === 0,
        });
      }
    }
  } catch (e) {}

  // Stock value
  let atCost = 0;
  let atSelling = 0;
  try {
    const variants = await Variant.find({}).lean();
    for (const v of variants as any) {
      const qty = (v.stockQty || 0) - (v.heldQty || 0);
      if (qty < 0) continue;
      atCost += (v.costPrice || 0) * qty;
      const eff = v.salePrice != null ? v.salePrice : v.price || 0;
      atSelling += eff * qty;
    }
  } catch (e) {}

  return {
    period,
    headline: {
      revenue: cur.revenue,
      previousRevenue: prev.revenue,
      paidOrders: cur.count,
      previousPaidOrders: prev.count,
      averageOrderValue: cur.aov,
      previousAverageOrderValue: prev.aov,
    },
    actionList: {
      ordersAwaitingProcessing,
      customRequestsNew,
      failedOrAbandonedPayments,
    },
    topProducts,
    revenueByCategory,
    lowStock,
    stockValue: { atCost, atSelling },
  };
}
