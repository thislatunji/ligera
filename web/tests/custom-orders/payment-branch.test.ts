import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/webhooks/flutterwave/route";
import { connectDb } from "@/lib/db/connect";
import { CustomRequest } from "@/lib/db/models/customRequest";
import { Order } from "@/lib/db/models/order";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";

vi.mock("@/lib/integrations/flutterwave", () => ({
  verifyTransaction: vi.fn().mockResolvedValue({ status: "successful", amount: 15000, currency: "NGN" }),
}));

vi.mock("@/lib/services/notifications/enqueue", () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ inserted: true }),
}));

describe("webhook CR- branch", () => {
  beforeEach(async () => {
    await connectDb();
    await CustomRequest.deleteMany({});
    await Order.deleteMany({});
    (enqueueNotification as any).mockClear();
    process.env.FLW_SECRET_HASH = "test-hash";
  });

  it("successful + amount match → request accepted, order created with source custom_request", async () => {
    const cr = await CustomRequest.create({
      requestNumber: "CR-000123",
      contact: { name: "Test", email: "t@test.com", phone: "08012345678" },
      spaceOrSetting: "Office",
      productTypes: ["candles"],
      scentPreferences: "Vanilla",
      status: "quoted",
      quoteAmount: 15000,
      paymentLink: { linkUrl: "http://x", txRef: "CR-000123", amount: 15000, status: "pending" },
    });

    const req = new Request("http://localhost/api/webhooks/flutterwave", {
      method: "POST",
      body: JSON.stringify({ event: "charge.completed", data: { id: 123, tx_ref: "CR-000123", amount: 15000, currency: "NGN", status: "successful" } }),
      headers: { "content-type": "application/json", "verif-hash": "test-hash" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const updated = await CustomRequest.findById(cr._id);
    expect(updated?.status).toBe("accepted");
    expect(updated?.paymentLink?.status).toBe("successful");
    const order = await Order.findOne({ source: "custom_request" });
    expect(order).toBeTruthy();
    expect(order?.status).toBe("paid");
    expect(order?.paymentStatus).toBe("successful");
    expect(order?.items?.[0]?.name).toContain("Custom order");
    expect(order?.orderNumber).toMatch(/^LG-/);
  });

  it("duplicate webhook → no second order", async () => {
    const cr = await CustomRequest.create({
      requestNumber: "CR-000124",
      contact: { name: "Test", email: "t@test.com", phone: "08012345678" },
      spaceOrSetting: "Office",
      productTypes: ["candles"],
      scentPreferences: "Vanilla",
      status: "quoted",
      quoteAmount: 15000,
      paymentLink: { linkUrl: "http://x", txRef: "CR-000124", amount: 15000, status: "pending" },
    });

    const body = JSON.stringify({ event: "charge.completed", data: { id: 123, tx_ref: "CR-000124", amount: 15000, currency: "NGN", status: "successful" } });
    const req1 = new Request("http://localhost/api/webhooks/flutterwave", {
      method: "POST",
      body,
      headers: { "content-type": "application/json", "verif-hash": "test-hash" },
    });
    await POST(req1);
    const req2 = new Request("http://localhost/api/webhooks/flutterwave", {
      method: "POST",
      body,
      headers: { "content-type": "application/json", "verif-hash": "test-hash" },
    });
    await POST(req2);
    const orders = await Order.find({ source: "custom_request" });
    expect(orders.length).toBe(1);
  });
});
