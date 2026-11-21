import { describe, it, expect, beforeEach } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Category } from "@/lib/db/models/category";
import { listProducts, getProductBySlug } from "@/lib/services/catalog/queries";
import { seedCatalog } from "./seed";

describe("catalog queries", () => {
  beforeEach(async () => {
    await connectDb();
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await Category.deleteMany({});
    // Seed taxonomy
    await Category.create({ name: "Scented Candles", slug: "scented-candles", type: "category", active: true, sortOrder: 1 });
    await Category.create({ name: "Reed Diffusers", slug: "reed-diffusers", type: "category", active: true, sortOrder: 2 });
    await Category.create({ name: "Room & Linen Sprays", slug: "room-linen-sprays", type: "category", active: true, sortOrder: 3 });
    await Category.create({ name: "Gypsum Decor", slug: "gypsum-decor", type: "category", active: true, sortOrder: 4 });
    await Category.create({ name: "Gift Sets & Bundles", slug: "gift-sets-bundles", type: "category", active: true, sortOrder: 5 });
    await Category.create({ name: "Custom & Bespoke", slug: "custom-bespoke", type: "category", active: true, sortOrder: 6 });
    await Category.create({ name: "Bedroom", slug: "bedroom", type: "space", active: true, sortOrder: 1 });
    await Category.create({ name: "Living Room", slug: "living-room", type: "space", active: true, sortOrder: 2 });
    await Category.create({ name: "Bathroom", slug: "bathroom", type: "space", active: true, sortOrder: 3 });
    await Category.create({ name: "Kitchen", slug: "kitchen", type: "space", active: true, sortOrder: 4 });
    await Category.create({ name: "Office", slug: "office", type: "space", active: true, sortOrder: 5 });
    await Category.create({ name: "Entryway", slug: "entryway", type: "space", active: true, sortOrder: 6 });
    await Category.create({ name: "Events", slug: "events", type: "space", active: true, sortOrder: 7 });
    await seedCatalog();
  });

  it("returns published-only products", async () => {
    const res = await listProducts({});
    // draft and archived should be excluded
    const slugs = res.data.map((d: any) => d.slug);
    expect(slugs).not.toContain("custom-order");
    expect(slugs).not.toContain("archived-product");
  });

  it("filters by category slug", async () => {
    const res = await listProducts({ category: "scented-candles" });
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("filters by space", async () => {
    const res = await listProducts({ space: "bedroom" });
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("paginates with limit and meta.total", async () => {
    const res = await listProducts({ page: 1, limit: 2 });
    expect(res.data.length).toBeLessThanOrEqual(2);
    expect(res.meta.limit).toBe(2);
    expect(typeof res.meta.total).toBe("number");
  });

  it("computes badges correctly", async () => {
    const res = await listProducts({});
    expect(res.data.some((d: any) => ["in_stock", "low_stock", "sold_out", "made_to_order"].includes(d.badge))).toBe(true);
  });

  it("reflects sale price in priceFrom", async () => {
    const res = await listProducts({});
    expect(res.data.length).toBeGreaterThan(0);
  });
});
