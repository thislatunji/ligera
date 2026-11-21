import { describe, it, expect, beforeEach } from "vitest";
import { connectDb } from "@/lib/db/connect";
import { NotificationLog } from "@/lib/db/models/notificationLog";
import { Order } from "@/lib/db/models/order";
import { Settings } from "@/lib/db/models/settings";
import { User } from "@/lib/db/models/user";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";

describe("enqueueNotification", () => {
  beforeEach(async () => {
    await connectDb();
    await NotificationLog.deleteMany({});
    await Order.deleteMany({});
    await Settings.deleteMany({});
    await User.deleteMany({});
  });

  it("inserts a pending row with the right dedupeKey, recipient, payload", async () => {
    const order = await Order.create({
      orderNumber: "LG-000001",
      status: "paid",
      customer: { email: "customer@example.com", name: "Test" },
      total: 5000,
    });

    const result = await enqueueNotification("order.paid.customer", {
      orderId: order._id.toString(),
      payload: { orderNumber: order.orderNumber, total: order.total },
    });

    expect(result.inserted).toBe(true);
    const logs = await NotificationLog.find({}).lean();
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe("pending");
    expect(logs[0].dedupeKey).toBe(`order.paid.customer:${order._id.toString()}`);
    expect(logs[0].recipient).toBe("customer@example.com");
    expect(logs[0].payload).toBeDefined();
  });

  it("duplicate enqueue returns inserted false and leaves exactly one row", async () => {
    const order = await Order.create({
      orderNumber: "LG-000002",
      status: "paid",
      customer: { email: "customer2@example.com", name: "Test2" },
    });

    const result1 = await enqueueNotification("order.paid.customer", {
      orderId: order._id.toString(),
      payload: { orderNumber: order.orderNumber },
    });
    expect(result1.inserted).toBe(true);

    const result2 = await enqueueNotification("order.paid.customer", {
      orderId: order._id.toString(),
      payload: { orderNumber: order.orderNumber },
    });
    expect(result2.inserted).toBe(false);

    const logs = await NotificationLog.find({}).lean();
    expect(logs.length).toBe(1);
  });

  it("dedupe table is exact: order.status.customer per target status", async () => {
    const order = await Order.create({
      orderNumber: "LG-000003",
      status: "processing",
      customer: { email: "customer3@example.com", name: "Test3" },
    });

    const res1 = await enqueueNotification("order.status.customer", {
      orderId: order._id.toString(),
      status: "processing",
    });
    expect(res1.inserted).toBe(true);

    const res2 = await enqueueNotification("order.status.customer", {
      orderId: order._id.toString(),
      status: "out_for_delivery",
    });
    expect(res2.inserted).toBe(true);

    const res3 = await enqueueNotification("order.status.customer", {
      orderId: order._id.toString(),
      status: "processing",
    });
    expect(res3.inserted).toBe(false);

    const logs = await NotificationLog.find({}).lean();
    expect(logs.length).toBe(2);
    const keys = logs.map((l) => l.dedupeKey).sort();
    expect(keys[0]).toBe(`order.status.customer:${order._id.toString()}:out_for_delivery`);
    expect(keys[1]).toBe(`order.status.customer:${order._id.toString()}:processing`);
  });

  it("stock.low.owner daily key with variantId and date", async () => {
    await Settings.create({});
    const variantId = "507f1f77bcf86cd799439011";
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const res1 = await enqueueNotification("stock.low.owner", {
      variantId,
      payload: { variantId, available: 2 },
    });
    expect(res1.inserted).toBe(true);

    const res2 = await enqueueNotification("stock.low.owner", {
      variantId,
      payload: { variantId, available: 1 },
    });
    expect(res2.inserted).toBe(false);

    const logs = await NotificationLog.find({}).lean();
    expect(logs.length).toBe(1);
    expect(logs[0].dedupeKey).toBe(`stock.low.owner:${variantId}:${dateStr}`);
  });

  it("recipient resolution: customer from order, owner from settings", async () => {
    const order = await Order.create({
      orderNumber: "LG-000004",
      status: "paid",
      customer: { email: "buyer@test.com" },
    });
    await enqueueNotification("order.paid.customer", { orderId: order._id.toString(), payload: {} });
    let logs = await NotificationLog.find({ type: "order.paid.customer" }).lean();
    expect(logs[0].recipient).toBe("buyer@test.com");

    await Settings.create({ emailTemplates: { ownerEmail: "owner@ligera.ng" } });
    await enqueueNotification("order.paid.owner", { orderId: order._id.toString(), payload: {} });
    logs = await NotificationLog.find({ type: "order.paid.owner" }).lean();
    expect(logs[0].recipient).toBe("owner@ligera.ng");
  });
});
