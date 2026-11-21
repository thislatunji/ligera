import { connectDb } from "@/lib/db/connect";
import { NotificationLog, NOTIFICATION_TYPES, type NotificationType } from "@/lib/db/models/notificationLog";
import { Order } from "@/lib/db/models/order";
import { CustomRequest } from "@/lib/db/models/customRequest";
import { Settings } from "@/lib/db/models/settings";
import { User } from "@/lib/db/models/user";

export type { NotificationType };
export { NOTIFICATION_TYPES };

function getTodayDateString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function resolveRecipient(type: NotificationType, ctx: any): Promise<string> {
  // Check if explicitly passed
  if (ctx.recipient) return String(ctx.recipient).toLowerCase();
  if (ctx.email) return String(ctx.email).toLowerCase();
  if (ctx.to) return String(ctx.to).toLowerCase();

  // Customer emails come from order or custom request
  if (
    type === "order.paid.customer" ||
    type === "order.status.customer" ||
    type === "order.cancelled.customer"
  ) {
    if (ctx.orderId) {
      await connectDb();
      const order = await Order.findById(ctx.orderId).lean();
      if (order) {
        const customer = (order as any).customer || {};
        if (customer.email) return String(customer.email).toLowerCase();
        if ((order as any).email) return String((order as any).email).toLowerCase();
      }
    }
  }

  if (
    type === "custom_request.submitted.customer" ||
    type === "custom_request.quoted.customer"
  ) {
    if (ctx.customRequestId) {
      await connectDb();
      const cr = await CustomRequest.findById(ctx.customRequestId).lean();
      if (cr) {
        if ((cr as any).email) return String((cr as any).email).toLowerCase();
        if ((cr as any).customerEmail) return String((cr as any).customerEmail).toLowerCase();
        if ((cr as any).contact?.email) return String((cr as any).contact.email).toLowerCase();
      }
    }
  }

  // Owner emails
  if (
    type === "order.paid.owner" ||
    type === "custom_request.submitted.owner" ||
    type === "stock.low.owner" ||
    type === "payment.mismatch.owner"
  ) {
    await connectDb();
    // Try settings first
    const settings = await Settings.findOne().lean();
    if ((settings as any)?.emailTemplates?.ownerEmail) {
      return String((settings as any).emailTemplates.ownerEmail).toLowerCase();
    }
    if ((settings as any)?.store?.email) {
      return String((settings as any).store.email).toLowerCase();
    }
    if ((settings as any)?.ownerEmail) {
      return String((settings as any).ownerEmail).toLowerCase();
    }
    // Try to find owner user
    const owner = await User.findOne({ role: "owner" }).lean();
    if (owner?.email) return String(owner.email).toLowerCase();
  }

  // Fallback
  return "orders@ligerascents.com";
}

function buildDedupeKey(type: NotificationType, ctx: any): string {
  // Handle stock.low.owner specially - daily per variant
  if (type === "stock.low.owner") {
    const variantId = ctx.variantId || ctx.variant || ctx.variant_id || "";
    const date = ctx.date || getTodayDateString();
    return `stock.low.owner:${variantId}:${date}`;
  }

  // order.status.customer needs target status
  if (type === "order.status.customer") {
    const status = ctx.variant || ctx.status || ctx.targetStatus || "";
    const orderId = ctx.orderId || ctx.order?._id || ctx.order?.id || "";
    return `order.status.customer:${orderId}:${status}`;
  }

  // order.cancelled.customer - can have cancelled/refunded variant
  if (type === "order.cancelled.customer") {
    const variant = ctx.variant || ctx.reasonType || (ctx.amount || ctx.refundAmount ? "refunded" : "cancelled");
    const orderId = ctx.orderId || ctx.order?._id || ctx.order?.id || "";
    return `order.cancelled.customer:${orderId}:${variant}`;
  }

  // For types that use orderId
  if (type.startsWith("order.")) {
    const orderId = ctx.orderId || ctx.order?._id || ctx.order?.id || "";
    if (ctx.variant && !["order.status.customer", "order.cancelled.customer"].includes(type)) {
      return `${type}:${orderId}:${ctx.variant}`;
    }
    return `${type}:${orderId}`;
  }

  // For custom request types
  if (type.startsWith("custom_request.")) {
    const crId = ctx.customRequestId || ctx.customRequest?._id || ctx.customRequest?.id || "";
    if (ctx.variant) {
      return `${type}:${crId}:${ctx.variant}`;
    }
    return `${type}:${crId}`;
  }

  // payment.mismatch.owner
  if (type === "payment.mismatch.owner") {
    const orderId = ctx.orderId || ctx.order?._id || ctx.order?.id || "";
    if (ctx.variant) {
      return `${type}:${orderId}:${ctx.variant}`;
    }
    return `${type}:${orderId}`;
  }

  // Fallback generic construction
  const subject = ctx.orderId || ctx.customRequestId || ctx.variantId || ctx.variant || "";
  if (ctx.variant && !subject.includes(ctx.variant)) {
    return `${type}:${subject}:${ctx.variant}`;
  }
  if (subject) {
    return `${type}:${subject}`;
  }
  return `${type}:${JSON.stringify(ctx)}`;
}

export async function enqueueNotification(type: NotificationType | string, ctx: any = {}): Promise<{ inserted: boolean }> {
  await connectDb();

  // Allow password.reset style too for compatibility
  const notificationType = type as NotificationType;
  const dedupeKey = buildDedupeKey(notificationType, ctx);
  const recipient = await resolveRecipient(notificationType, ctx);

  try {
    // Check if exists first
    const existing = await NotificationLog.findOne({ dedupeKey }).lean();
    if (existing) {
      return { inserted: false };
    }
    const created = await NotificationLog.create({
      type: notificationType,
      recipient,
      orderId: ctx.orderId || (ctx.order?._id) || null,
      customRequestId: ctx.customRequestId || (ctx.customRequest?._id) || null,
      dedupeKey,
      payload: ctx.payload || ctx,
      status: "pending",
      retryCount: 0,
      nextAttemptAt: new Date(),
    });
    return { inserted: true };
  } catch (error: any) {
    // If duplicate key error due to unique index, treat as not inserted
    if (error.code === 11000) {
      return { inserted: false };
    }
    throw error;
  }
}
