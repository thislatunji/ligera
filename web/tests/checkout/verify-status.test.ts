import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET as getStatus } from "@/app/api/checkout/orders/[orderNumber]/status/route";
import { GET as verifyStatus } from "@/app/api/checkout/orders/[orderNumber]/verify-status/route";
import { connectDb } from "@/lib/db/connect";
import { Product } from "@/lib/db/models/product";
import { Variant } from "@/lib/db/models/variant";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { StockAdjustment } from "@/lib/db/models/stockAdjustment";
import {
  verifyTransaction,
  verifyTransactionByReference,
} from "@/lib/integrations/flutterwave";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";

vi.mock("@/lib/integrations/flutterwave", () => ({
  verifyTransaction: vi.fn(),
  verifyTransactionByReference: vi.fn(),
}));

vi.mock("@/lib/services/notifications/enqueue", () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ inserted: true }),
}));

describe("Public guest order status & verify-status routes", () => {
  beforeEach(async () => {
    await connectDb();
    await Product.deleteMany({});
    await Variant.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await StockAdjustment.deleteMany({});
    vi.clearAllMocks();

    const product = await Product.create({
      name: "Amber Hush",
      slug: "amber-hush",
      status: "published",
      popularity: 0,
    });
    const variant = await Variant.create({
      productId: product._id,
      label: "200g",
      sku: "AMB-200",
      price: 18500,
      stockQty: 5,
      heldQty: 1,
      lowStockThreshold: 2,
      active: true,
    });
    const order = await Order.create({
      orderNumber: "LG-000001",
      customer: {
        name: "Adaeze",
        email: "adaeze@example.com",
        phone: "08096613114",
      },
      items: [
        {
          variantId: variant._id,
          productId: product._id,
          name: "Amber Hush",
          sku: "AMB-200",
          unitPrice: 18500,
          qty: 1,
        },
      ],
      subtotal: 18500,
      deliveryFee: 3000,
      total: 21500,
      deliveryMethod: "delivery",
      deliveryZoneName: "Lekki",
      deliveryAddress: {
        address: "12 Admiralty Way",
        city: "Lekki",
        state: "Lagos",
      },
      giftNote: "Happy birthday!",
      expectedDeliveryWindow: "2–3 working days",
      status: "pending_payment",
      paymentStatus: "pending",
      holdExpiresAt: new Date(Date.now() + 1800000),
    });
    await Payment.create({
      orderId: order._id,
      orderNumber: "LG-000001",
      provider: "flutterwave",
      reference: "LG-000001",
      linkUrl: "https://flutterwave.com/pay/lg1",
      amount: 21500,
      currency: "NGN",
      status: "pending",
    });
  });

  it("GET /status returns 200 without auth, omits PII, and exposes paymentUrl only while pending", async () => {
    const req = new Request(
      "http://localhost/api/checkout/orders/LG-000001/status"
    );
    const res = await getStatus(req, {
      params: Promise.resolve({ orderNumber: "LG-000001" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.orderNumber).toBe("LG-000001");
    expect(data.status).toBe("pending_payment");
    expect(data.paymentStatus).toBe("pending");
    expect(data.total).toBe(21500);
    expect(data.paymentUrl).toBe("https://flutterwave.com/pay/lg1");

    // Strictly no PII
    expect(data.customer).toBeUndefined();
    expect(data.email).toBeUndefined();
    expect(data.phone).toBeUndefined();
    expect(data.deliveryAddress).toBeUndefined();
    expect(data.giftNote).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain("adaeze@example.com");
    expect(JSON.stringify(data)).not.toContain("08096613114");
    expect(JSON.stringify(data)).not.toContain("Admiralty Way");
  });

  it("GET /status returns 404 for unknown order and 400 for invalid orderNumber", async () => {
    const unknownRes = await getStatus(
      new Request("http://localhost/api/checkout/orders/LG-999999/status"),
      { params: Promise.resolve({ orderNumber: "LG-999999" }) }
    );
    expect(unknownRes.status).toBe(404);

    const invalidRes = await getStatus(
      new Request("http://localhost/api/checkout/orders/invalid-ref/status"),
      { params: Promise.resolve({ orderNumber: "invalid-ref" }) }
    );
    expect(invalidRes.status).toBe(400);
  });

  it("GET /verify-status confirms payment by reference, updates stock once, and is idempotent", async () => {
    (verifyTransactionByReference as any).mockResolvedValue({
      id: 98765,
      tx_ref: "LG-000001",
      amount: 21500,
      currency: "NGN",
      status: "successful",
    });

    const req1 = new Request(
      "http://localhost/api/checkout/orders/LG-000001/verify-status"
    );
    const res1 = await verifyStatus(req1, {
      params: Promise.resolve({ orderNumber: "LG-000001" }),
    });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.status).toBe("paid");
    expect(data1.paymentStatus).toBe("successful");
    expect(data1.paymentUrl).toBeNull();
    expect(data1.paidAt).toBeTruthy();

    const variant = await Variant.findOne();
    expect(variant?.stockQty).toBe(4);
    expect(variant?.heldQty).toBe(0);
    expect(await StockAdjustment.countDocuments({ reason: "order_paid" })).toBe(1);
    expect(enqueueNotification).toHaveBeenCalledTimes(2);

    // Repeat call should be an idempotent no-op without calling gateway or double-decrementing
    vi.clearAllMocks();
    const res2 = await verifyStatus(
      new Request("http://localhost/api/checkout/orders/LG-000001/verify-status"),
      { params: Promise.resolve({ orderNumber: "LG-000001" }) }
    );
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.status).toBe("paid");
    expect(verifyTransactionByReference).not.toHaveBeenCalled();
    expect((await Variant.findOne())?.stockQty).toBe(4);
    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it("GET /verify-status rejects mismatched tx_ref on transaction_id and falls back to verifyTransactionByReference", async () => {
    (verifyTransaction as any).mockResolvedValue({
      id: 12345,
      tx_ref: "LG-999999", // belongs to another order!
      amount: 21500,
      currency: "NGN",
      status: "successful",
    });
    (verifyTransactionByReference as any).mockResolvedValue({
      tx_ref: "LG-000001",
      status: "pending",
    });

    const res = await verifyStatus(
      new Request(
        "http://localhost/api/checkout/orders/LG-000001/verify-status?transaction_id=12345"
      ),
      { params: Promise.resolve({ orderNumber: "LG-000001" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(verifyTransaction).toHaveBeenCalledWith("12345");
    expect(verifyTransactionByReference).toHaveBeenCalledWith("LG-000001");
    expect(data.status).toBe("pending_payment");
  });

  it("GET /verify-status flags amount mismatch without marking order paid", async () => {
    (verifyTransactionByReference as any).mockResolvedValue({
      id: 55555,
      tx_ref: "LG-000001",
      amount: 1000, // short payment
      currency: "NGN",
      status: "successful",
    });

    const res = await verifyStatus(
      new Request(
        "http://localhost/api/checkout/orders/LG-000001/verify-status"
      ),
      { params: Promise.resolve({ orderNumber: "LG-000001" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("pending_payment");
    expect(data.paymentStatus).toBe("underpaid");
    expect(enqueueNotification).toHaveBeenCalledWith(
      "payment.mismatch.owner",
      expect.objectContaining({
        orderNumber: "LG-000001",
        amount: 1000,
        expected: 21500,
      })
    );
    const order = await Order.findOne({ orderNumber: "LG-000001" });
    expect(order?.status).toBe("pending_payment");
  });

  it("GET /verify-status falls back gracefully when Flutterwave throws", async () => {
    (verifyTransactionByReference as any).mockRejectedValue(
      new Error("Flutterwave verify failed: 503")
    );

    const res = await verifyStatus(
      new Request(
        "http://localhost/api/checkout/orders/LG-000001/verify-status"
      ),
      { params: Promise.resolve({ orderNumber: "LG-000001" }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("pending_payment");
    expect(data.paymentStatus).toBe("pending");
  });
});
