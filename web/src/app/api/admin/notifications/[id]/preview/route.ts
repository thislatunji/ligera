import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { connectDb } from "@/lib/db/connect";
import { NotificationLog } from "@/lib/db/models/notificationLog";
import { Settings } from "@/lib/db/models/settings";
import { renderOrderPaidCustomer } from "@/lib/services/notifications/templates/order-paid-customer";
import { renderOrderPaidOwner } from "@/lib/services/notifications/templates/order-paid-owner";
import { renderOrderStatusCustomer } from "@/lib/services/notifications/templates/order-status-customer";
import { renderOrderCancelledCustomer } from "@/lib/services/notifications/templates/order-cancelled-customer";
import { renderCustomRequestSubmittedCustomer, renderCustomRequestSubmittedOwner } from "@/lib/services/notifications/templates/custom-request-submitted";
import { renderCustomRequestQuotedCustomer } from "@/lib/services/notifications/templates/custom-request-quoted";
import { renderStockLowOwner } from "@/lib/services/notifications/templates/stock-low-owner";
import { renderPaymentMismatchOwner } from "@/lib/services/notifications/templates/payment-mismatch-owner";

function renderTemplate(type: string, payload: any, overrides: any = {}) {
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
      return `<html><body>Preview not available</body></html>`;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireAuth(request, ["owner"]);
  if (auth instanceof NextResponse) {
    if (auth.status === 403) {
      return NextResponse.json({ error: "Only the owner can view email logs.", code: "AUTH_FORBIDDEN" }, { status: 403 });
    }
    return auth;
  }

  try {
    await connectDb();
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const row = await NotificationLog.findById(id).lean();
    if (!row) {
      return NextResponse.json({ error: "Notification not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    const settings = await Settings.findOne().lean();
    const emailTemplatesOverrides = (settings as any)?.emailTemplates || {};
    const overrides = emailTemplatesOverrides[(row as any).type] || {};
    const payload = (row as any).payload || {};
    const html = renderTemplate((row as any).type, payload, overrides);
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
