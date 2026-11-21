import { describe, it, expect, beforeEach, vi } from "vitest";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-key";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-key";

vi.mock("@/lib/auth/guard", () => ({
  requireAuth: vi.fn(),
}));

import { GET as listNotifications } from "@/app/api/admin/notifications/route";
import { GET as previewNotification } from "@/app/api/admin/notifications/[id]/preview/route";
import { POST as resendNotification } from "@/app/api/admin/notifications/[id]/resend/route";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { NotificationLog } from "@/lib/db/models/notificationLog";
import { User } from "@/lib/db/models/user";
import { Order } from "@/lib/db/models/order";
import { requireAuth } from "@/lib/auth/guard";

async function createOwner(email = "owner@ligera.ng") {
  await connectDb();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: "Owner",
      email,
      passwordHash: "hash",
      role: "owner",
    });
  }
  (requireAuth as any).mockResolvedValue({ userId: user._id.toString(), role: "owner", email: user.email, name: user.name });
  return { user };
}

async function createStaff(email = "staff@ligera.ng") {
  await connectDb();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: "Staff",
      email,
      passwordHash: "hash",
      role: "staff",
    });
  }
  const { NextResponse } = await import("next/server");
  (requireAuth as any).mockResolvedValue(NextResponse.json({ error: "Only the owner can view email logs.", code: "AUTH_FORBIDDEN" }, { status: 403 }));
  return { user };
}

describe("notifications admin routes", () => {
  beforeEach(async () => {
    await connectDb();
    await NotificationLog.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
  });

  it("GET list filters, orderNumber resolution, paging", async () => {
    await createOwner();
    const order = await Order.create({ orderNumber: "LG-200001", status: "paid", customer: { email: "c@test.com" } });
    await NotificationLog.create({
      type: "order.paid.customer",
      recipient: "c@test.com",
      orderId: order._id,
      dedupeKey: `order.paid.customer:${order._id}`,
      payload: {},
      status: "sent",
      retryCount: 0,
      nextAttemptAt: new Date(),
      sentAt: new Date(),
    });
    await NotificationLog.create({
      type: "order.paid.owner",
      recipient: "owner@ligera.ng",
      orderId: order._id,
      dedupeKey: `order.paid.owner:${order._id}`,
      payload: {},
      status: "failed",
      retryCount: 5,
      nextAttemptAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/admin/notifications?status=sent&page=1&limit=10", {
      method: "GET",
    });
    const res = await listNotifications(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(1);
    expect(json.data[0].orderNumber).toBe("LG-200001");
  });

  it("GET preview renders HTML, no fresh sends", async () => {
    await createOwner();
    const order = await Order.create({ orderNumber: "LG-200002", status: "paid", customer: { email: "c2@test.com" } });
    const log = await NotificationLog.create({
      type: "order.paid.customer",
      recipient: "c2@test.com",
      orderId: order._id,
      dedupeKey: `order.paid.customer:${order._id}`,
      payload: { orderNumber: order.orderNumber, items: [], total: 1000, deliveryFee: 500 },
      status: "sent",
      retryCount: 0,
      nextAttemptAt: new Date(),
    });
    const req = new NextRequest(`http://localhost/api/admin/notifications/${log._id}/preview`, {
      method: "GET",
    });
    const res = await previewNotification(req, { params: { id: log._id.toString() } });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("LG-200002");
  });

  it("POST resend resets failed/sent to pending with fresh attempt; 409 if pending; 403 for staff; 404 if not found", async () => {
    await createOwner();
    const order = await Order.create({ orderNumber: "LG-200003", status: "paid", customer: { email: "c3@test.com" } });
    const failedLog = await NotificationLog.create({
      type: "order.paid.customer",
      recipient: "c3@test.com",
      orderId: order._id,
      dedupeKey: `order.paid.customer:${order._id}:failed`,
      payload: {},
      status: "failed",
      retryCount: 5,
      nextAttemptAt: new Date(),
      lastError: "err",
    });
    const req = new NextRequest(`http://localhost/api/admin/notifications/${failedLog._id}/resend`, {
      method: "POST",
    });
    const res = await resendNotification(req, { params: { id: failedLog._id.toString() } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("pending");
    const updated = await NotificationLog.findById(failedLog._id).lean();
    expect(updated?.retryCount).toBe(0);
    expect(updated?.lastError).toBeNull();

    // 409 if already pending
    await createOwner();
    const pendingLog = await NotificationLog.create({
      type: "order.paid.owner",
      recipient: "owner@ligera.ng",
      orderId: order._id,
      dedupeKey: `order.paid.owner:${order._id}`,
      payload: {},
      status: "pending",
      retryCount: 0,
      nextAttemptAt: new Date(),
    });
    const req409 = new NextRequest(`http://localhost/api/admin/notifications/${pendingLog._id}/resend`, {
      method: "POST",
    });
    const res409 = await resendNotification(req409, { params: { id: pendingLog._id.toString() } });
    expect(res409.status).toBe(409);

    // 403 for staff
    await createStaff();
    const req403 = new NextRequest(`http://localhost/api/admin/notifications/${failedLog._id}/resend`, {
      method: "POST",
    });
    const res403 = await resendNotification(req403, { params: { id: failedLog._id.toString() } });
    expect(res403.status).toBe(403);

    // 404
    await createOwner();
    const req404 = new NextRequest(`http://localhost/api/admin/notifications/000000000000000000000000/resend`, {
      method: "POST",
    });
    const res404 = await resendNotification(req404, { params: { id: "000000000000000000000000" } });
    expect(res404.status).toBe(404);
  });
});
