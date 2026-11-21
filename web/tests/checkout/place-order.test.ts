import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/checkout/orders/route";
import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Settings } from "@/lib/db/models/settings";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";

vi.mock("@/lib/integrations/flutterwave", () => ({
  createPaymentLink: vi.fn().mockResolvedValue({ link: "https://flutterwave.com/pay/test", linkId: "link_123" }),
  verifyTransaction: vi.fn(),
  refundTransaction: vi.fn(),
}));

describe("POST /api/checkout/orders", () => {
  beforeEach(async () => {
    await connectDb();
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await DeliveryZone.deleteMany({});
    await Settings.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    const product = await Product.create({ name: "Candle", slug: "candle", status: "published" });
    const variant = await Variant.create({ productId: product._id, label: "Small", sku: "CAND-S", price: 5000, stockQty: 1, heldQty: 0, active: true });
    await DeliveryZone.create({ name: "Lekki", fee: 3000, etaText: "2–3 working days", active: true, sortOrder: 1 });
    await Settings.create({ delivery: { freeDeliveryThreshold: 150000, cutOffTime: "15:00", blackoutDates: [] } });
  });

  it("happy path creates order pending_payment", async () => {
    const variant = await Variant.findOne();
    const zone = await DeliveryZone.findOne();
    const req = new Request("http://localhost/api/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        contact: { name: "Test User", email: "test@example.com", phone: "08012345678" },
        address: { address: "123 Test St", city: "Lagos", state: "Lagos" },
        zoneId: zone!._id.toString(),
        deliveryMethod: "delivery",
        items: [{ variantId: variant!._id.toString(), qty: 1 }],
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.orderNumber).toMatch(/^LG-/);
    expect(data.paymentUrl).toBeTruthy();
    const order = await Order.findOne();
    expect(order?.status).toBe("pending_payment");
    expect(order?.holdExpiresAt).toBeTruthy();
  });

  it("last-unit race (AC-005): exactly one 201, other 409", async () => {
    const variant = await Variant.findOne();
    const zone = await DeliveryZone.findOne();
    const body = JSON.stringify({
      contact: { name: "Test User", email: "test@example.com", phone: "08012345678" },
      address: { address: "123 Test St", city: "Lagos", state: "Lagos" },
      zoneId: zone!._id.toString(),
      deliveryMethod: "delivery",
      items: [{ variantId: variant!._id.toString(), qty: 1 }],
    });
    const req1 = new Request("http://localhost/api/checkout/orders", { method: "POST", body, headers: { "content-type": "application/json" } });
    const req2 = new Request("http://localhost/api/checkout/orders", { method: "POST", body, headers: { "content-type": "application/json" } });
    const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);
    const v = await Variant.findById(variant!._id);
    expect(v?.heldQty).toBe(1);
  });
});
