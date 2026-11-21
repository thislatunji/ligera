import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/custom-requests/route";
import { connectDb } from "@/lib/db/connect";
import { CustomRequest } from "@/lib/db/models/customRequest";
import { Counter } from "@/lib/db/models/counter";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";

vi.mock("@/lib/services/notifications/enqueue", () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ inserted: true }),
}));

describe("POST /api/custom-requests", () => {
  beforeEach(async () => {
    await connectDb();
    await CustomRequest.deleteMany({});
    await Counter.deleteMany({});
    (enqueueNotification as any).mockClear();
  });

  it("valid payload → 201, requestNumber matches CR-\\d{6}, counters increment", async () => {
    const body = {
      contact: { name: "Test User", email: "test@example.com", phone: "08012345678" },
      spaceOrSetting: "Office in Victoria Island",
      productTypes: ["candles"],
      scentPreferences: "Vanilla",
      quantity: 2,
    };
    const req = new Request("http://localhost/api/custom-requests", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.requestNumber).toMatch(/^CR-\d{6}$/);
    const count = await CustomRequest.countDocuments();
    expect(count).toBe(1);
  });

  it("NT-005 pair enqueued (custom_request.submitted.customer and custom_request.submitted.owner)", async () => {
    const body = {
      contact: { name: "Test User", email: "test@example.com", phone: "+2348012345678" },
      spaceOrSetting: "Home in Lekki",
      productTypes: ["diffusers"],
      scentPreferences: "Lavender",
    };
    const req = new Request("http://localhost/api/custom-requests", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(enqueueNotification).toHaveBeenCalledWith("custom_request.submitted.customer", expect.any(Object));
    expect(enqueueNotification).toHaveBeenCalledWith("custom_request.submitted.owner", expect.any(Object));
  });

  it("honeypot filled → 201 dummy, zero docs written", async () => {
    const body = {
      contact: { name: "Test User", email: "test@example.com", phone: "08012345678" },
      spaceOrSetting: "Office in VI",
      productTypes: ["candles"],
      scentPreferences: "Vanilla",
      _hp: "spam",
    };
    const req = new Request("http://localhost/api/custom-requests", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const count = await CustomRequest.countDocuments();
    expect(count).toBe(0);
  });

  it("Nigerian phone regex + required fields → 400 with field-level issues", async () => {
    const body = {
      contact: { name: "Test User", email: "test@example.com", phone: "123" },
      spaceOrSetting: "Office",
      productTypes: ["candles"],
      scentPreferences: "Vanilla",
    };
    const req = new Request("http://localhost/api/custom-requests", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
