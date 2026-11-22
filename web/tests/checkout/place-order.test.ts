import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/checkout/orders/route";
import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Settings } from "@/lib/db/models/settings";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { createPaymentLink } from "@/lib/integrations/flutterwave";

vi.mock("@/lib/integrations/flutterwave", () => ({
  createPaymentLink: vi.fn().mockResolvedValue({ link: "https://flutterwave.com/pay/test", linkId: "link_123" }),
  verifyTransaction: vi.fn(),
  verifyTransactionByReference: vi.fn(),
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
    vi.clearAllMocks();
    (createPaymentLink as any).mockResolvedValue({
      link: "https://flutterwave.com/pay/test",
      linkId: "link_123",
    });

    const product = await Product.create({ name: "Candle", slug: "candle", status: "published" });
    await Variant.create({ productId: product._id, label: "Small", sku: "CAND-S", price: 5000, stockQty: 1, heldQty: 0, active: true });
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

  it("supports studio pickup with ₦0 delivery fee and formatted Nigerian phone", async () => {
    const variant = await Variant.findOne();
    const req = new Request("http://localhost/api/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        contact: { name: "Pickup Guest", email: "pickup@example.com", phone: "0809 661 3114" },
        deliveryMethod: "pickup",
        items: [{ variantId: variant!._id.toString(), qty: 1 }],
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.total).toBe(5000);
    const order = await Order.findOne({ orderNumber: data.orderNumber });
    expect(order?.deliveryMethod).toBe("pickup");
    expect(order?.deliveryFee).toBe(0);
    expect(order?.deliveryZoneName).toBe("Gbagada Studio Pickup");
    expect(order?.customer?.phone).toBe("08096613114");
  });

  it("rejects invalid or inactive zoneId with 422 without holding stock", async () => {
    const variant = await Variant.findOne();
    const inactiveZone = await DeliveryZone.create({
      name: "Paused Zone",
      fee: 2000,
      etaText: "3 days",
      active: false,
      sortOrder: 2,
    });

    for (const zoneId of ["not-an-object-id", inactiveZone._id.toString()]) {
      const req = new Request("http://localhost/api/checkout/orders", {
        method: "POST",
        body: JSON.stringify({
          contact: { name: "Test User", email: "test@example.com", phone: "08012345678" },
          address: { address: "123 Test St", city: "Lagos", state: "Lagos" },
          zoneId,
          deliveryMethod: "delivery",
          items: [{ variantId: variant!._id.toString(), qty: 1 }],
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.code).toBe("ZONE_INVALID");
    }

    const v = await Variant.findById(variant!._id);
    expect(v?.heldQty).toBe(0);
  });

  it("resolves product slug fallback and returns 409 ITEM_UNAVAILABLE for unknown non-ObjectId item", async () => {
    const unknownRes = await POST(
      new Request("http://localhost/api/checkout/orders", {
        method: "POST",
        body: JSON.stringify({
          contact: { name: "Test User", email: "test@example.com", phone: "08012345678" },
          deliveryMethod: "pickup",
          items: [{ variantId: "nonexistent-slug", qty: 1 }],
        }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(unknownRes.status).toBe(409);
    const unknownJson = await unknownRes.json();
    expect(unknownJson.code).toBe("ITEM_UNAVAILABLE");

    const slugRes = await POST(
      new Request("http://localhost/api/checkout/orders", {
        method: "POST",
        body: JSON.stringify({
          contact: { name: "Test User", email: "test@example.com", phone: "08012345678" },
          deliveryMethod: "pickup",
          items: [{ variantId: "candle", qty: 1 }],
        }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(slugRes.status).toBe(201);
  });

  it("releases held stock and deletes order/payment if payment link is empty (502)", async () => {
    (createPaymentLink as any).mockResolvedValue({ link: "", linkId: null });
    const variant = await Variant.findOne();
    const res = await POST(
      new Request("http://localhost/api/checkout/orders", {
        method: "POST",
        body: JSON.stringify({
          contact: { name: "Test User", email: "test@example.com", phone: "08012345678" },
          deliveryMethod: "pickup",
          items: [{ variantId: variant!._id.toString(), qty: 1 }],
        }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.code).toBe("PAYMENT_LINK_FAILED");
    expect((await Variant.findById(variant!._id))?.heldQty).toBe(0);
    expect(await Order.countDocuments()).toBe(0);
    expect(await Payment.countDocuments()).toBe(0);
  });
});
