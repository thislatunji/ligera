import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/checkout/quote/route";
import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Settings } from "@/lib/db/models/settings";

describe("POST /api/checkout/quote", () => {
  beforeEach(async () => {
    await connectDb();
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await DeliveryZone.deleteMany({});
    await Settings.deleteMany({});
    const product = await Product.create({ name: "Candle", slug: "candle", status: "published" });
    const variant = await Variant.create({ productId: product._id, label: "Small", sku: "CAND-S", price: 5000, stockQty: 10, heldQty: 0, active: true });
    await DeliveryZone.create({ name: "Lekki", fee: 3000, etaText: "2–3 working days", active: true, sortOrder: 1 });
    await Settings.create({ delivery: { freeDeliveryThreshold: 150000, cutOffTime: "15:00", blackoutDates: [] } });
  });

  it("returns quote", async () => {
    const req = new Request("http://localhost/api/checkout/quote", {
      method: "POST",
      body: JSON.stringify({ items: [{ variantId: (await Variant.findOne())!._id.toString(), qty: 2 }], zoneId: (await DeliveryZone.findOne())!._id.toString(), deliveryMethod: "delivery" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.subtotal).toBe(10000);
  });
});
