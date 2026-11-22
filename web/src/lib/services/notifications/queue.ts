import { connectDb } from "@/lib/db/connect";
import { NotificationLog } from "@/lib/db/models/notificationLog";
import { Settings } from "@/lib/db/models/settings";
import { sendEmail } from "./sender";
import { renderOrderPaidCustomer } from "./templates/order-paid-customer";
import { renderOrderPaidOwner } from "./templates/order-paid-owner";
import { renderOrderStatusCustomer } from "./templates/order-status-customer";
import { renderOrderCancelledCustomer } from "./templates/order-cancelled-customer";
import { renderCustomRequestSubmittedCustomer, renderCustomRequestSubmittedOwner } from "./templates/custom-request-submitted";
import { renderCustomRequestQuotedCustomer } from "./templates/custom-request-quoted";
import { renderStockLowOwner } from "./templates/stock-low-owner";
import { renderPaymentMismatchOwner } from "./templates/payment-mismatch-owner";

const BACKOFF_SCHEDULE = [30000, 120000, 600000, 1800000, 7200000]; // 30s, 2m, 10m, 30m, 2h

function getFromAddress() {
  return process.env.EMAIL_FROM || "Ligera <orders@ligerascents.com>";
}

function getSubject(type: string, payload: any): string {
  const subjects: Record<string, string> = {
    "order.paid.customer": "Your Ligera order is confirmed",
    "order.paid.owner": "New paid order",
    "order.status.customer": "Your Ligera order update",
    "order.cancelled.customer": "Your Ligera order has been cancelled",
    "custom_request.submitted.customer": "We received your custom request",
    "custom_request.submitted.owner": "New custom request submitted",
    "custom_request.quoted.customer": "Your custom quote is ready",
    "stock.low.owner": "Low stock alert",
    "payment.mismatch.owner": "Payment mismatch alert",
  };
  return subjects[type] || "Ligera notification";
}

function renderTemplate(type: string, payload: any, overrides: any = {}) {
  try {
    switch (type) {
      case "order.paid.customer":
        return renderOrderPaidCustomer(payload, overrides);
      case "order.paid.owner":
        return renderOrderPaidOwner(payload, overrides);
      case "order.status.customer":
        return renderOrderStatusCustomer(payload, overrides);
      case "order.cancelled.customer":
        return renderOrderCancelledCustomer(payload, overrides);
      case "custom_request.submitted.customer":
        return renderCustomRequestSubmittedCustomer(payload, overrides);
      case "custom_request.submitted.owner":
        return renderCustomRequestSubmittedOwner(payload, overrides);
      case "custom_request.quoted.customer":
        return renderCustomRequestQuotedCustomer(payload, overrides);
      case "stock.low.owner":
        return renderStockLowOwner(payload, overrides);
      case "payment.mismatch.owner":
        return renderPaymentMismatchOwner(payload, overrides);
      default:
        return `<html><body>Notification</body></html>`;
    }
  } catch (error) {
    throw error;
  }
}

async function deliverNotificationRow(row: any, emailTemplatesOverrides: Record<string, any>) {
  try {
    // Status guard to prevent double-send
    const current = await NotificationLog.findOne({ _id: row._id });
    if (!current || current.status !== "pending") {
      return;
    }

    const payload = (row.payload as any) || {};
    const overrides = emailTemplatesOverrides[row.type] || {};

    const html = renderTemplate(row.type, payload, overrides);
    const subject = getSubject(row.type, payload);

    const result = await sendEmail({
      from: getFromAddress(),
      to: row.recipient,
      subject,
      html,
      headers: { "X-Entity-Ref": row.dedupeKey },
    });

    const providerId = (result as any)?.data?.id || (result as any)?.id || null;
    const sentAt = new Date();

    await NotificationLog.findOneAndUpdate(
      { _id: row._id, status: "pending" },
      {
        status: "sent",
        sentAt,
        providerId,
      }
    );
  } catch (error: any) {
    try {
      const current = await NotificationLog.findOne({ _id: row._id });
      if (!current) return;
      if (current.status === "sent") return; // don't retry if already sent

      const retryCount = (current.retryCount || 0) + 1;
      if (retryCount >= 5) {
        let lastError = error?.message || String(error);
        if (lastError.length > 500) {
          lastError = lastError.substring(0, 500);
        }
        await NotificationLog.findOneAndUpdate(
          { _id: row._id },
          {
            status: "failed",
            retryCount,
            lastError,
          }
        );
      } else {
        const backoffMs = BACKOFF_SCHEDULE[retryCount - 1] || BACKOFF_SCHEDULE[BACKOFF_SCHEDULE.length - 1];
        const nextAttemptAt = new Date(Date.now() + backoffMs);
        let lastError = error?.message || String(error);
        if (lastError.length > 500) {
          lastError = lastError.substring(0, 500);
        }
        await NotificationLog.findOneAndUpdate(
          { _id: row._id },
          {
            status: "pending",
            retryCount,
            nextAttemptAt,
            lastError,
          }
        );
      }
    } catch {
      // Don't block caller on error persistence failure
    }
  }
}

export async function deliverNotificationById(id: string) {
  await connectDb();
  const row = await NotificationLog.findById(id);
  if (!row || row.status !== "pending") {
    return;
  }
  const settings = await Settings.findOne().lean();
  const emailTemplatesOverrides = (settings as any)?.emailTemplates || {};
  await deliverNotificationRow(row, emailTemplatesOverrides);
}

export async function processNotificationQueue() {
  await connectDb();
  const now = new Date();

  // Find due pending rows
  const rows = await NotificationLog.find({
    status: "pending",
    nextAttemptAt: { $lte: now },
  }).limit(50);

  const settings = await Settings.findOne().lean();
  const emailTemplatesOverrides = (settings as any)?.emailTemplates || {};

  for (const row of rows) {
    await deliverNotificationRow(row, emailTemplatesOverrides);
  }
}

export { BACKOFF_SCHEDULE };
export default processNotificationQueue;
