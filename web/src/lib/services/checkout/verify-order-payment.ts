import { connectDb } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { Variant } from "@/lib/db/models/variant";
import { Product } from "@/lib/db/models/product";
import { StockAdjustment } from "@/lib/db/models/stockAdjustment";
import {
  verifyTransaction,
  verifyTransactionByReference,
} from "@/lib/integrations/flutterwave";
import { enqueueNotification } from "@/lib/services/notifications/enqueue";

export interface PublicOrderPaymentView {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  deliveryMethod: "delivery" | "pickup";
  deliveryZoneName: string;
  items: Array<{ name: string; qty: number; unitPrice: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  expectedDeliveryWindow: string;
  placedAt: string;
  paidAt: string | null;
  paymentUrl: string | null;
}

export type ApplyPaymentOutcome =
  | "paid"
  | "already_paid"
  | "amount_mismatch"
  | "underpaid"
  | "failed"
  | "pending";

export function stripCardFields(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const stripped: any = Array.isArray(obj) ? [] : {};
  const sensitive = ["card", "pan", "cvv", "expiry", "card_number", "cardbin"];
  for (const key of Object.keys(obj)) {
    if (sensitive.some((s) => key.toLowerCase().includes(s))) {
      continue;
    }
    if (typeof obj[key] === "object") {
      stripped[key] = stripCardFields(obj[key]);
    } else {
      stripped[key] = obj[key];
    }
  }
  return stripped;
}

function toIsoOrNull(val: any): string | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toPublicOrderPaymentView(order: any, payment?: any): PublicOrderPaymentView {
  const placedAt =
    toIsoOrNull(order?.createdAt) ?? new Date().toISOString();
  const paidAt =
    toIsoOrNull(order?.paidAt) ??
    (order?.paymentStatus === "successful" || payment?.status === "successful"
      ? toIsoOrNull(payment?.verifiedAt)
      : null);

  const resolvedPaymentStatus =
    order?.paymentStatus && order.paymentStatus !== "pending"
      ? order.paymentStatus
      : payment?.status || order?.paymentStatus || "pending";

  return {
    orderNumber: String(order?.orderNumber || ""),
    status: String(order?.status || "pending_payment"),
    paymentStatus: String(resolvedPaymentStatus),
    deliveryMethod: order?.deliveryMethod === "pickup" ? "pickup" : "delivery",
    deliveryZoneName: String(order?.deliveryZoneName || ""),
    items: Array.isArray(order?.items)
      ? order.items.map((item: any) => ({
          name: String(item?.name || ""),
          qty: Number(item?.qty || 0),
          unitPrice: Number(item?.unitPrice || 0),
        }))
      : [],
    subtotal: Number(order?.subtotal || 0),
    deliveryFee: Number(order?.deliveryFee || 0),
    total: Number(order?.total || 0),
    expectedDeliveryWindow: String(order?.expectedDeliveryWindow || ""),
    placedAt,
    paidAt,
    paymentUrl:
      order?.status === "pending_payment" ? (payment?.linkUrl || null) : null,
  };
}

export async function applyVerifiedPayment(
  order: any,
  payment: any,
  verified: any,
  rawEvent?: any
): Promise<{ outcome: ApplyPaymentOutcome }> {
  if (payment.status === "successful" && order.status !== "pending_payment") {
    return { outcome: "already_paid" };
  }

  const txStatus = String(verified?.status || "").toLowerCase();
  const isSuccess =
    txStatus === "successful" || txStatus === "success" || txStatus === "completed";
  const isFailure = txStatus === "failed" || txStatus === "cancelled";

  if (isSuccess) {
    const verifiedAmount = Number(verified?.amount);
    const verifiedCurrency = String(verified?.currency || "NGN").toUpperCase();

    if (
      !Number.isFinite(verifiedAmount) ||
      verifiedAmount !== order.total ||
      verifiedCurrency !== "NGN"
    ) {
      await enqueueNotification("payment.mismatch.owner", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        tx_ref: payment.reference || order.orderNumber,
        amount: verifiedAmount,
        expected: order.total,
      });
      return {
        outcome:
          Number.isFinite(verifiedAmount) && verifiedAmount < order.total
            ? "underpaid"
            : "amount_mismatch",
      };
    }

    const paidAt = new Date();
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: "pending_payment" },
      {
        status: "paid",
        paymentStatus: "successful",
        paidAt,
        $push: { statusTimeline: { status: "paid", at: paidAt } },
      },
      { new: true }
    );
    if (!updatedOrder) {
      return { outcome: "already_paid" };
    }

    const items = updatedOrder.items || order.items || [];
    for (const item of items as any[]) {
      const variant = item.variantId ? await Variant.findById(item.variantId) : null;
      const product = item.productId ? await Product.findById(item.productId).lean() : null;
      const isMadeToOrder = Boolean(variant?.madeToOrder || (product as any)?.madeToOrder);

      if (variant && !isMadeToOrder) {
        const qty = Number(item.qty || 0);
        const heldDec = Math.min(qty, Math.max(0, variant.heldQty || 0));
        await Variant.findByIdAndUpdate(item.variantId, {
          $inc: { stockQty: -qty, heldQty: -heldDec },
        });
        try {
          await StockAdjustment.create({
            variantId: item.variantId,
            qty: -qty,
            delta: -qty,
            change: -qty,
            reason: "order_paid",
            orderId: updatedOrder._id.toString(),
            productId: item.productId,
          });
        } catch (e) {
          console.error("stock adj error", e);
        }

        const updatedVariant = await Variant.findById(item.variantId).lean();
        const available = updatedVariant
          ? Math.max(
              0,
              ((updatedVariant as any).stockQty || 0) -
                ((updatedVariant as any).heldQty || 0)
            )
          : 0;
        if (available <= ((updatedVariant as any)?.lowStockThreshold || 5)) {
          await enqueueNotification("stock.low.owner", {
            variantId: item.variantId,
            productId: item.productId,
            available,
          });
        }
      }
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { popularity: item.qty || 0 },
        });
      }
    }

    const paymentUpdate: Record<string, unknown> = {
      status: "successful",
      verifiedAt: paidAt,
    };
    if (verified?.id !== undefined && verified?.id !== null) {
      paymentUpdate.externalRef = String(verified.id);
    }
    if (rawEvent !== undefined) {
      paymentUpdate.rawEvent = stripCardFields(rawEvent);
    }

    await Payment.findOneAndUpdate({ _id: payment._id }, paymentUpdate);

    await enqueueNotification("order.paid.customer", {
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
    });
    await enqueueNotification("order.paid.owner", {
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
    });

    return { outcome: "paid" };
  }

  if (isFailure) {
    if (payment.status !== "successful" && order.status === "pending_payment") {
      await Payment.findOneAndUpdate({ _id: payment._id }, { status: "failed" });
    }
    return { outcome: "failed" };
  }

  return { outcome: "pending" };
}

export async function getPublicOrderPaymentStatus(
  orderNumber: string
): Promise<PublicOrderPaymentView | null> {
  await connectDb();
  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) return null;

  const payment =
    (await Payment.findOne({ orderId: (order as any)._id }).lean()) ||
    (await Payment.findOne({ reference: orderNumber }).lean());

  return toPublicOrderPaymentView(order, payment);
}

export async function verifyPublicOrderPaymentStatus(
  orderNumber: string,
  transactionId?: string | null
): Promise<PublicOrderPaymentView | null> {
  await connectDb();
  const order: any = await Order.findOne({ orderNumber });
  if (!order) return null;

  const payment: any =
    (await Payment.findOne({ orderId: order._id })) ||
    (await Payment.findOne({ reference: orderNumber }));

  if (
    order.status === "paid" ||
    payment?.status === "successful" ||
    !payment ||
    order.status !== "pending_payment"
  ) {
    return toPublicOrderPaymentView(order, payment);
  }

  let overridePaymentStatus: string | null = null;
  const reference = payment.reference || order.orderNumber || orderNumber;

  try {
    let verified: any = null;
    if (transactionId && /^\d+$/.test(transactionId.trim())) {
      const candidate = await verifyTransaction(transactionId.trim());
      if (candidate && candidate.tx_ref === reference) {
        verified = candidate;
      }
    }

    if (!verified) {
      const byRef = await verifyTransactionByReference(reference);
      if (byRef && (!byRef.tx_ref || byRef.tx_ref === reference)) {
        verified = byRef;
      }
    }

    if (verified) {
      const res = await applyVerifiedPayment(order, payment, verified);
      if (res.outcome === "amount_mismatch" || res.outcome === "underpaid") {
        overridePaymentStatus = res.outcome;
      }
    }
  } catch (err) {
    console.warn("verifyPublicOrderPaymentStatus: gateway verification failed", err);
  }

  const [freshOrder, freshPayment] = await Promise.all([
    Order.findById(order._id).lean(),
    Payment.findById(payment._id).lean(),
  ]);

  const view = toPublicOrderPaymentView(freshOrder || order, freshPayment || payment);
  if (overridePaymentStatus && view.status === "pending_payment") {
    view.paymentStatus = overridePaymentStatus;
  }
  return view;
}
