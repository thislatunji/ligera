import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";
import { verifyTransaction } from "@/integrations/flutterwave";
import { commitPaidOrder } from "@/lib/services/checkout/paid-commit";
import type { VerifyPaymentResult } from "@/lib/api/types/orders";

export async function verifyPayment(orderId: string): Promise<VerifyPaymentResult> {
  const order: any = await Order.findById(orderId);
  if (!order) {
    return {
      checked: true,
      outcome: "not_found",
      orderStatus: "unknown",
      message: "Order not found.",
    };
  }

  if (order.status === "paid" || order.paymentStatus === "successful") {
    return {
      checked: true,
      outcome: "already_paid",
      orderStatus: order.status,
      message: "This order is already marked as paid.",
    };
  }

  const payment = await Payment.findOne({ orderId: order._id }) || await Payment.findOne({ reference: order.orderNumber });

  try {
    const verifyResult = await verifyTransaction(payment?.linkId || payment?.reference || order.orderNumber);

    // Check if successful
    if (verifyResult?.status === "successful" || verifyResult?.data?.status === "successful") {
      const verifiedAmount = verifyResult?.amount || verifyResult?.data?.amount || payment?.amount || order.total;
      const expectedAmount = order.total || payment?.amount || 0;

      if (verifiedAmount && expectedAmount && verifiedAmount !== expectedAmount) {
        try {
          await enqueueNotification("payment.mismatch.owner", { orderId: order._id, verifiedAmount, expectedAmount });
        } catch (e) {}
        return {
          checked: true,
          outcome: "amount_mismatch",
          orderStatus: order.status,
          message: "Payment amount mismatch detected. Owner has been notified.",
        };
      }

      // Amount matches or we can't tell - proceed to commit
      try {
        await commitPaidOrder(order._id.toString(), verifyResult);
        const updated = await Order.findById(order._id);
        return {
          checked: true,
          outcome: order.status === "abandoned" ? "paid_now" : "successful_pending_apply",
          orderStatus: updated?.status || "paid",
          message: "Payment verified successfully. Order has been marked as paid.",
        };
      } catch (e) {
        return {
          checked: true,
          outcome: "successful_pending_apply",
          orderStatus: order.status,
          message: "Payment appears successful. Please try again or contact support.",
        };
      }
    }

    if (verifyResult?.status === "failed" || verifyResult?.data?.status === "failed") {
      return {
        checked: true,
        outcome: "failed",
        orderStatus: order.status,
        message: "Payment was not successful.",
      };
    }

    return {
      checked: true,
      outcome: "not_found",
      orderStatus: order.status,
      message: "No successful payment found for this order.",
    };
  } catch (e) {
    return {
      checked: true,
      outcome: "failed",
      orderStatus: order.status,
      message: "Unable to verify payment at this time.",
    };
  }
}
