import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/webhooks/flutterwave/route";
import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { StockAdjustment } from "@/lib/db/models/stockAdjustment";
import { verifyTransaction } from "@/lib/integrations/flutterwave";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";

vi.mock("@/lib/integrations/flutterwave", () => ({
  verifyTransaction: vi.fn().mockResolvedValue({ status: "successful", amount: 8000, currency: "NGN" }),
}));

vi.mock("@/lib/services/notifications/enqueue", () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ inserted: true }),
}));

describe("POST /api/webhooks/flutterwave", () => {
  beforeEach(async () => {
    await connectDb();
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await StockAdjustment.deleteMany({});
    vi.clearAllMocks();
    (verifyTransaction as any).mockResolvedValue({ status: "successful", amount: 8000, currency: "NGN" });
    process.env.FLW_SECRET_HASH = "test-hash";

    const product = await Product.create({ name: "Candle", slug: "candle", status: "published", popularity: 0 });
    const variant = await Variant.create({ productId: product._id, label: "Small", sku: "CAND-S", price: 5000, stockQty: 10, heldQty: 1, active: true });
    const order = await Order.create({
      orderNumber: "LG-000001",
      customer: { name: "Test", email: "t@test.com", phone: "08012345678" },
      items: [{ variantId: variant._id, productId: product._id, name: "Candle", sku: "CAND-S", unitPrice: 5000, qty: 1 }],
      subtotal: 5000,
      deliveryFee: 3000,
      total: 8000,
      deliveryMethod: "delivery",
      status: "pending_payment",
      paymentStatus: "pending",
      holdExpiresAt: new Date(Date.now() + 1800000),
    });
    await Payment.create({ orderId: order._id, provider: "flutterwave", reference: "LG-000001", amount: 8000, currency: "NGN", status: "pending" });
  });

  it("wrong verif-hash -> 401", async () => {
    const req = new Request("http://localhost/api/webhooks/flutterwave", {
      method: "POST",
      body: JSON.stringify({ event: "charge.completed", data: { id: 123, tx_ref: "LG-000001", amount: 8000, currency: "NGN", status: "successful" } }),
      headers: { "content-type": "application/json", "verif-hash": "wrong" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("successful charge marks paid and commits stock once", async () => {
    const req = new Request("http://localhost/api/webhooks/flutterwave", {
      method: "POST",
      body: JSON.stringify({ event: "charge.completed", data: { id: 123, tx_ref: "LG-000001", amount: 8000, currency: "NGN", status: "successful" } }),
      headers: { "content-type": "application/json", "verif-hash": "test-hash" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const order = await Order.findOne({ orderNumber: "LG-000001" });
    expect(order?.status).toBe("paid");
    expect(order?.paymentStatus).toBe("successful");
    const variant = await Variant.findOne();
    expect(variant?.stockQty).toBe(9);
    expect(variant?.heldQty).toBe(0);
    const adj = await StockAdjustment.find({ reason: "order_paid" });
    expect(adj.length).toBe(1);
    expect(enqueueNotification).toHaveBeenCalled();
  });

  it("duplicate webhook is idempotent (stock committed once, single StockAdjustment)", async () => {
    const payload = JSON.stringify({
      event: "charge.completed",
      data: { id: 123, tx_ref: "LG-000001", amount: 8000, currency: "NGN", status: "successful" },
    });
    const res1 = await POST(
      new Request("http://localhost/api/webhooks/flutterwave", {
        method: "POST",
        body: payload,
        headers: { "content-type": "application/json", "verif-hash": "test-hash" },
      })
    );
    expect(res1.status).toBe(200);

    vi.clearAllMocks();
    const res2 = await POST(
      new Request("http://localhost/api/webhooks/flutterwave", {
        method: "POST",
        body: payload,
        headers: { "content-type": "application/json", "verif-hash": "test-hash" },
      })
    );
    expect(res2.status).toBe(200);

    const variant = await Variant.findOne();
    expect(variant?.stockQty).toBe(9);
    expect(variant?.heldQty).toBe(0);
    expect(await StockAdjustment.countDocuments({ reason: "order_paid" })).toBe(1);
    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it("does not drive heldQty negative on madeToOrder variants", async () => {
    const product = await Product.create({
      name: "Bespoke Diffuser",
      slug: "bespoke-diffuser",
      status: "published",
      madeToOrder: true,
    });
    const mtoVariant = await Variant.create({
      productId: product._id,
      label: "Custom",
      sku: "MTO-1",
      price: 12000,
      stockQty: 0,
      heldQty: 0,
      madeToOrder: true,
      active: true,
    });
    const mtoOrder = await Order.create({
      orderNumber: "LG-000002",
      customer: { name: "Test", email: "t@test.com", phone: "08012345678" },
      items: [
        {
          variantId: mtoVariant._id,
          productId: product._id,
          name: "Bespoke Diffuser",
          sku: "MTO-1",
          unitPrice: 12000,
          qty: 2,
        },
      ],
      subtotal: 24000,
      deliveryFee: 0,
      total: 24000,
      deliveryMethod: "pickup",
      status: "pending_payment",
      paymentStatus: "pending",
    });
    await Payment.create({
      orderId: mtoOrder._id,
      provider: "flutterwave",
      reference: "LG-000002",
      amount: 24000,
      currency: "NGN",
      status: "pending",
    });

    (verifyTransaction as any).mockResolvedValue({
      status: "successful",
      amount: 24000,
      currency: "NGN",
    });

    const res = await POST(
      new Request("http://localhost/api/webhooks/flutterwave", {
        method: "POST",
        body: JSON.stringify({
          event: "charge.completed",
          data: { id: 456, tx_ref: "LG-000002", amount: 24000, currency: "NGN", status: "successful" },
        }),
        headers: { "content-type": "application/json", "verif-hash": "test-hash" },
      })
    );
    expect(res.status).toBe(200);
    const updatedMto = await Variant.findById(mtoVariant._id);
    expect(updatedMto?.heldQty).toBe(0);
    expect(updatedMto?.stockQty).toBe(0);
    expect((await Order.findById(mtoOrder._id))?.status).toBe("paid");
  });

  it("does NOT mark order paid when verifyTransaction returns failed even if webhook body claims successful", async () => {
    (verifyTransaction as any).mockResolvedValue({
      status: "failed",
      amount: 8000,
      currency: "NGN",
    });

    const res = await POST(
      new Request("http://localhost/api/webhooks/flutterwave", {
        method: "POST",
        body: JSON.stringify({
          event: "charge.completed",
          data: { id: 123, tx_ref: "LG-000001", amount: 8000, currency: "NGN", status: "successful" },
        }),
        headers: { "content-type": "application/json", "verif-hash": "test-hash" },
      })
    );
    expect(res.status).toBe(200);
    const order = await Order.findOne({ orderNumber: "LG-000001" });
    expect(order?.status).toBe("pending_payment");
    const payment = await Payment.findOne({ reference: "LG-000001" });
    expect(payment?.status).toBe("failed");
    expect(enqueueNotification).not.toHaveBeenCalled();
  });
});
