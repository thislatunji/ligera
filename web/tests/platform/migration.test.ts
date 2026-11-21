import { describe, it, expect, beforeEach } from "vitest";
import { migrateFromSupabase } from "../../scripts/migrate-from-supabase";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { Counter } from "@/lib/db/models/counter";
import { connectDb } from "@/lib/db/connect";

describe("migrate-from-supabase", () => {
  beforeEach(async () => {
    await connectDb();
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Counter.deleteMany({});
  }, 30000);

  it("migrates 8 products with variants and orders with payments", async () => {
    const products = Array.from({ length: 8 }, (_, i) => ({
      id: `prod-${i + 1}`,
      name: `Product ${i + 1}`,
      slug: `product-${i + 1}`,
      status: i % 2 === 0 ? "published" : "draft",
      sku: `SKU-${i + 1}`,
      price: 1000 + i,
    }));
    const orders = Array.from({ length: 3 }, (_, i) => ({
      id: `order-${i + 1}`,
      status: "completed",
      total: 5000 + i,
    }));

    const supabaseClient = {
      from: (table: string) => ({
        select: async () => {
          if (table === "products") return { data: products };
          if (table === "orders") return { data: orders };
          return { data: [] };
        },
      }),
    };

    const result = await migrateFromSupabase(supabaseClient);
    expect(await Product.countDocuments()).toBe(8);
    expect(await Variant.countDocuments()).toBe(8);
    expect(await Order.countDocuments()).toBe(3);
    expect(await Payment.countDocuments()).toBe(3);

    const variant = await Variant.findOne();
    expect(variant?.lowStockThreshold).toBe(5);

    // second run is a no-op
    await migrateFromSupabase(supabaseClient);
    expect(await Product.countDocuments()).toBe(8);
    expect(await Order.countDocuments()).toBe(3);

    const orderCounter = await Counter.findById("order");
    expect(orderCounter?.seq).toBeGreaterThanOrEqual(3);
  }, 60000);
});
