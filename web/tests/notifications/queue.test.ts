import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      };
    },
  };
});

import { connectDb } from "@/lib/db/connect";
import { NotificationLog } from "@/lib/db/models/notificationLog";
import { Order } from "@/lib/db/models/order";
import { processNotificationQueue } from "@/lib/services/notifications/queue";

describe("notification queue processor", () => {
  beforeEach(async () => {
    await connectDb();
    await NotificationLog.deleteMany({});
    await Order.deleteMany({});
    mockSend.mockReset();
    vi.useRealTimers();
  });

  it("due pending rows send exactly one Resend call each", async () => {
    mockSend.mockResolvedValue({ data: { id: "re_123" } });
    const order = await Order.create({
      orderNumber: "LG-100001",
      status: "paid",
      customer: { email: "c1@test.com" },
      items: [],
      total: 1000,
      deliveryFee: 500,
    });
    await NotificationLog.create({
      type: "order.paid.customer",
      recipient: "c1@test.com",
      orderId: order._id,
      dedupeKey: `order.paid.customer:${order._id}`,
      payload: { orderNumber: order.orderNumber, items: [], total: 1500, deliveryFee: 500 },
      status: "pending",
      retryCount: 0,
      nextAttemptAt: new Date(Date.now() - 1000),
    });
    await processNotificationQueue();
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("success marks sent with sentAt and providerId; status guard blocks double-send", async () => {
    mockSend.mockResolvedValue({ data: { id: "re_456" } });
    const order = await Order.create({
      orderNumber: "LG-100002",
      status: "paid",
      customer: { email: "c2@test.com" },
    });
    const log = await NotificationLog.create({
      type: "order.paid.customer",
      recipient: "c2@test.com",
      orderId: order._id,
      dedupeKey: `order.paid.customer:${order._id}`,
      payload: { orderNumber: order.orderNumber },
      status: "pending",
      retryCount: 0,
      nextAttemptAt: new Date(Date.now() - 1000),
    });
    await processNotificationQueue();
    await processNotificationQueue(); // sweep twice
    expect(mockSend).toHaveBeenCalledTimes(1);
    const updated = await NotificationLog.findById(log._id).lean();
    expect(updated?.status).toBe("sent");
    expect(updated?.sentAt).toBeDefined();
    expect(updated?.providerId).toBe("re_456");
  });

  it("failure increments retryCount and follows backoff schedule; 5th failure marks failed with truncated lastError", async () => {
    mockSend.mockRejectedValue(new Error("SMTP error"));
    const order = await Order.create({
      orderNumber: "LG-100003",
      status: "paid",
      customer: { email: "c3@test.com" },
    });
    const log = await NotificationLog.create({
      type: "order.paid.customer",
      recipient: "c3@test.com",
      orderId: order._id,
      dedupeKey: `order.paid.customer:${order._id}`,
      payload: { orderNumber: order.orderNumber },
      status: "pending",
      retryCount: 0,
      nextAttemptAt: new Date(Date.now() - 1000),
    });
    
    // First failure
    await processNotificationQueue();
    let updated = await NotificationLog.findById(log._id).lean();
    expect(updated?.retryCount).toBe(1);
    expect(updated?.status).toBe("pending");
    
    // Simulate next attempts
    for (let i = 2; i <= 5; i++) {
      await NotificationLog.findByIdAndUpdate(log._id, { status: "pending", nextAttemptAt: new Date(Date.now() - 1000) });
      await processNotificationQueue();
      updated = await NotificationLog.findById(log._id).lean();
      if (i < 5) {
        expect(updated?.retryCount).toBe(i);
        expect(updated?.status).toBe("pending");
      } else {
        expect(updated?.retryCount).toBe(5);
        expect(updated?.status).toBe("failed");
        expect((updated?.lastError || "").length).toBeLessThanOrEqual(500);
      }
    }
  });

  it("a poisoned row does not block the rest of the batch", async () => {
    mockSend
      .mockRejectedValueOnce(new Error("bad"))
      .mockResolvedValueOnce({ data: { id: "re_ok" } });
    const order1 = await Order.create({ orderNumber: "LG-100004", status: "paid", customer: { email: "c4@test.com" } });
    const order2 = await Order.create({ orderNumber: "LG-100005", status: "paid", customer: { email: "c5@test.com" } });
    await NotificationLog.create({
      type: "order.paid.customer",
      recipient: "c4@test.com",
      orderId: order1._id,
      dedupeKey: `order.paid.customer:${order1._id}`,
      payload: { orderNumber: order1.orderNumber },
      status: "pending",
      retryCount: 0,
      nextAttemptAt: new Date(Date.now() - 1000),
    });
    await NotificationLog.create({
      type: "order.paid.customer",
      recipient: "c5@test.com",
      orderId: order2._id,
      dedupeKey: `order.paid.customer:${order2._id}`,
      payload: { orderNumber: order2.orderNumber },
      status: "pending",
      retryCount: 0,
      nextAttemptAt: new Date(Date.now() - 1000),
    });
    await processNotificationQueue();
    expect(mockSend).toHaveBeenCalledTimes(2);
    const logs = await NotificationLog.find({}).sort({ recipient: 1 }).lean();
    expect(logs[0].status).toBe("pending"); // failed first attempt, goes to retry
    expect(logs[1].status).toBe("sent");
  });
});
