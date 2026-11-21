import { connectDb } from "@/lib/db/connect";
import { Variant } from "@/lib/db/models/variant";
import { StockAdjustment } from "@/lib/db/models/stockAdjustment";
import { Product } from "@/lib/db/models/product";
import mongoose from "mongoose";

// Mock enqueue tracker
const enqueuedToday = new Set<string>();

function shouldEnqueueLowStock(variantId: string) {
  const today = new Date().toISOString().split("T")[0];
  const key = `${variantId}:${today}`;
  if (enqueuedToday.has(key)) return false;
  enqueuedToday.add(key);
  return true;
}

export async function adjustStock(variantId: string, input: { change: number; reason: string; note?: string }, userId: string) {
  await connectDb();
  const variant = await Variant.findById(variantId);
  if (!variant) {
    const err: any = new Error("We couldn't find that variant.");
    err.code = "NOT_FOUND";
    err.status = 404;
    throw err;
  }

  // Check floor guard - stockQty + change >= 0?
  if ((variant.stockQty || 0) + input.change < 0) {
    const err: any = new Error("Stock can't go below zero.");
    err.code = "STOCK_NEGATIVE";
    err.status = 422;
    throw err;
  }

  // Atomic update
  await Variant.findOneAndUpdate({ _id: variantId, stockQty: { $gte: -(input.change) } }, { $inc: { stockQty: input.change } });

  // Refresh variant
  const updated = await Variant.findById(variantId);
  if (!updated) {
    const err: any = new Error("Stock can't go below zero.");
    err.code = "STOCK_NEGATIVE";
    err.status = 422;
    throw err;
  }

  // Create adjustment row
  await StockAdjustment.create({
    variantId: new mongoose.Types.ObjectId(variantId),
    change: input.change,
    reason: input.reason,
    userId: new mongoose.Types.ObjectId(userId),
    note: input.note || "",
  });

  // Check low stock threshold crossing
  const available = (updated.stockQty || 0) - (updated.heldQty || 0);
  if (available > 0 && available <= (updated.lowStockThreshold || 5)) {
    if (shouldEnqueueLowStock(variantId)) {
      // Mock enqueue
      // enqueue('stock.low.owner', { variantId })
    }
  }

  return { stockQty: updated.stockQty, available };
}

export async function getLowStock(threshold?: number) {
  await connectDb();
  const variants = await Variant.find({ active: true }).lean();
  const results = [];
  for (const v of variants) {
    const available = (v.stockQty || 0) - (v.heldQty || 0);
    const th = threshold !== undefined ? threshold : v.lowStockThreshold || 5;
    const product = await Product.findById(v.productId).lean();
    if (!product) continue;
    // exclude made-to-order? "low-stock aggregation excludes made-to-order" per phase 5 - need to check product
    if (product.madeToOrder) continue;
    if (available <= th || available <= 0) {
      results.push({
        variantId: v._id.toString(),
        product: { id: product._id.toString(), name: product.name, slug: product.slug },
        label: v.label,
        sku: v.sku,
        available,
        lowStockThreshold: v.lowStockThreshold || 5,
        soldOut: available <= 0,
      });
    }
  }
  return results;
}
