import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/admin/custom-requests/[id]/quote/route";
import { connectDb } from "@/lib/db/connect";
import { CustomRequest } from "@/lib/db/models/customRequest";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import { createPaymentLink } from "@/lib/integrations/flutterwave";

vi.mock("@/lib/auth/guard", () => ({
  requireAuth: vi.fn(async () => ({ userId: "u1", role: "owner", email: "owner@test.com", name: "Owner" })),
}));

vi.mock("@/lib/services/notifications/enqueue", () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ inserted: true }),
}));

vi.mock("@/lib/integrations/flutterwave", () => ({
  createPaymentLink: vi.fn().mockResolvedValue({ link: "https://pay.example.com/CR-000123", linkId: "link_123" }),
  verifyTransaction: vi.fn(),
}));

describe("POST /api/admin/custom-requests/:id/quote", () => {
  beforeEach(async () => {
    await connectDb();
    await CustomRequest.deleteMany({});
    (enqueueNotification as any).mockClear();
    (createPaymentLink as any).mockClear();
  });

  it("amount < 1000 → 422", async () => {
    const doc = await CustomRequest.create({
      requestNumber: "CR-000001",
      contact: { name: "Test", email: "t@test.com", phone: "08012345678" },
      spaceOrSetting: "Office",
      productTypes: ["candles"],
      scentPreferences: "Vanilla",
      status: "new",
    });
    const req = new Request("http://localhost/api/admin/custom-requests/" + doc._id + "/quote", {
      method: "POST",
      body: JSON.stringify({ amount: 500 }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, { params: { id: doc._id.toString() } });
    expect(res.status).toBe(422);
  });

  it("success: paymentLink persisted, status quoted, NT-006 enqueued with paymentLinkUrl", async () => {
    const doc = await CustomRequest.create({
      requestNumber: "CR-000002",
      contact: { name: "Test", email: "t@test.com", phone: "08012345678" },
      spaceOrSetting: "Office",
      productTypes: ["candles"],
      scentPreferences: "Vanilla",
      status: "new",
    });
    const req = new Request("http://localhost/api/admin/custom-requests/" + doc._id + "/quote", {
      method: "POST",
      body: JSON.stringify({ amount: 15000 }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, { params: { id: doc._id.toString() } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.paymentLinkUrl).toBeTruthy();
    const updated = await CustomRequest.findById(doc._id);
    expect(updated?.status).toBe("quoted");
    expect(updated?.paymentLink?.txRef).toBe("CR-000002");
    expect(enqueueNotification).toHaveBeenCalledWith("custom_request.quoted.customer", expect.objectContaining({ paymentLinkUrl: expect.any(String) }));
  });
});
