import mongoose from "mongoose";
import { Variant } from "@/lib/db/models/variant";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { Customer } from "@/lib/db/models/customer";
import { Settings } from "@/lib/db/models/settings";
import { nextNumber } from "@/lib/db/models/counter";
import { createPaymentLink } from "@/lib/integrations/flutterwave";
import { calculateDeliveryFee } from "./fees";
import { computeExpectedDeliveryWindow } from "./window";
import { resolveCheckoutItems } from "./resolve-items";
import { releaseExpiredHolds } from "./hold-release";

export async function placeOrder(input: any) {
  await releaseExpiredHolds().catch(() => {});
  const resolvedLines = await resolveCheckoutItems(input.items || []);

  // Validate delivery zone before reserving stock
  const deliveryMethod: "delivery" | "pickup" =
    input.deliveryMethod === "pickup" ? "pickup" : "delivery";
  let zone: any = null;
  if (deliveryMethod === "delivery") {
    if (
      !input.address ||
      !input.zoneId ||
      !mongoose.Types.ObjectId.isValid(String(input.zoneId))
    ) {
      const err: any = new Error("Choose a delivery zone.");
      err.code = "ZONE_INVALID";
      throw err;
    }
    zone = await DeliveryZone.findOne({ _id: input.zoneId, active: true }).lean();
    if (!zone) {
      const err: any = new Error("Choose a delivery zone.");
      err.code = "ZONE_INVALID";
      throw err;
    }
  }

  // Reserve stock atomically
  const reserved: Array<{ variantId: any; qty: number }> = [];
  try {
    for (const line of resolvedLines) {
      if (line.madeToOrder) {
        continue; // skip reservation
      }
      const updated = await Variant.findOneAndUpdate(
        {
          _id: line.variant._id,
          active: true,
          $expr: { $gte: [{ $subtract: ["$stockQty", "$heldQty"] }, line.qty] },
        },
        { $inc: { heldQty: line.qty } },
        { new: true }
      );
      if (!updated) {
        throw new Error("STOCK_SOLD_OUT");
      }
      reserved.push({ variantId: line.variant._id, qty: line.qty });
    }
  } catch (e: any) {
    // Compensate reserved
    for (const r of reserved) {
      try {
        await Variant.findByIdAndUpdate(r.variantId, { $inc: { heldQty: -r.qty } });
      } catch {
        // ignore rollback error
      }
    }
    if (e.message === "STOCK_SOLD_OUT") {
      const failedItems: any[] = [];
      for (const line of resolvedLines) {
        if (line.madeToOrder) continue;
        const v = await Variant.findById(line.variant._id).lean();
        const available = v ? Math.max(0, (v.stockQty || 0) - (v.heldQty || 0)) : 0;
        if (available < line.qty) {
          failedItems.push({
            slug: line.product?.slug,
            name: line.product
              ? `${line.product.name} — ${line.variant.label || line.variant.sku}`
              : line.variant.label || line.variant.sku,
          });
        }
      }
      const err: any = new Error(
        "Some items just sold out. Please remove it to continue."
      );
      err.code = "STOCK_SOLD_OUT";
      err.items = failedItems.length
        ? failedItems
        : resolvedLines.map((l) => ({ name: l.variantId }));
      throw err;
    }
    throw e;
  }

  const settings: any = await Settings.findOne().lean();
  const freeDeliveryThreshold = settings?.delivery?.freeDeliveryThreshold || 0;

  // Build order items snapshot
  let subtotal = 0;
  const orderItems = resolvedLines.map((line) => {
    const { variant, product, qty } = line;
    const unitPrice =
      variant.salePrice != null && variant.salePrice !== undefined
        ? variant.salePrice
        : variant.price || 0;
    subtotal += unitPrice * qty;
    return {
      variantId: variant._id,
      productId: product._id,
      name: product.name,
      sku: variant.sku,
      unitPrice,
      qty,
      imageUrl: product.images?.[0]?.publicId
        ? undefined
        : product.images?.[0]?.url || product.images?.[0]?.alt || undefined,
    };
  });

  const deliveryFee = calculateDeliveryFee({
    deliveryMethod,
    subtotal,
    zoneFee: zone?.fee || 0,
    freeDeliveryThreshold,
  });
  const total = subtotal + deliveryFee;

  const maxLeadTimeDays = resolvedLines.reduce(
    (acc: number, line) =>
      Math.max(acc, line.product.madeToOrder ? line.product.leadTimeDays || 0 : 0),
    0
  );
  const expectedDeliveryWindow =
    deliveryMethod === "pickup"
      ? "Studio pickup — Ready within 24 hours (Mon–Sat, 9:00 AM – 6:00 PM WAT)"
      : computeExpectedDeliveryWindow({
          zoneEtaText: zone?.etaText,
          cutOffTime: settings?.delivery?.cutOffTime || "15:00",
          blackoutDates: settings?.delivery?.blackoutDates || [],
          maxLeadTimeDays,
        });

  const orderNumber = await nextNumber("order");
  const holdExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

  // Upsert customer
  await Customer.findOneAndUpdate(
    { email: input.contact.email.toLowerCase() },
    {
      $set: { name: input.contact.name, phone: input.contact.phone },
      $setOnInsert: { marketingConsent: input.marketingConsent || false },
    },
    { upsert: true }
  );

  // Create order
  const order = await Order.create({
    orderNumber,
    customer: {
      name: input.contact.name,
      email: input.contact.email.toLowerCase(),
      phone: input.contact.phone,
    },
    items: orderItems,
    subtotal,
    deliveryFee,
    discount: input.discount || 0,
    total,
    deliveryMethod,
    deliveryZoneId: deliveryMethod === "delivery" ? zone?._id || null : null,
    deliveryZoneName: deliveryMethod === "delivery" ? zone?.name || "" : "Gbagada Studio Pickup",
    deliveryAddress: deliveryMethod === "delivery" ? input.address || undefined : undefined,
    giftNote: input.giftNote || "",
    hidePrices: input.hidePrices || false,
    status: "pending_payment",
    paymentStatus: "pending",
    statusTimeline: [{ status: "pending_payment", at: new Date() }],
    holdExpiresAt,
    expectedDeliveryWindow,
    source: "storefront",
  });

  // Create payment doc
  await Payment.create({
    orderId: order._id,
    orderNumber: order.orderNumber,
    provider: "flutterwave",
    reference: orderNumber,
    amount: total,
    currency: "NGN",
    status: "pending",
  });

  // Create payment link
  const appUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  try {
    const result = await createPaymentLink({
      tx_ref: orderNumber,
      amount: total,
      currency: "NGN",
      customer: {
        email: input.contact.email,
        name: input.contact.name,
        phone: input.contact.phone,
      },
      redirect_url: `${appUrl}/order/${orderNumber}`,
      customizations: { title: "Ligera" },
      meta: {
        orderNumber,
        source: "storefront_checkout",
      },
    });
    if (!result?.link) {
      throw new Error("Empty payment link returned");
    }
    await Payment.findOneAndUpdate(
      { orderId: order._id },
      { linkUrl: result.link, linkId: result.linkId }
    );
  } catch {
    // Release holds, delete order and payment
    for (const r of reserved) {
      try {
        await Variant.findByIdAndUpdate(r.variantId, { $inc: { heldQty: -r.qty } });
      } catch {
        // ignore rollback error
      }
    }
    await Payment.deleteOne({ orderId: order._id });
    await Order.deleteOne({ _id: order._id });
    const e: any = new Error("We couldn't start your payment. Please try again.");
    e.code = "PAYMENT_LINK_FAILED";
    throw e;
  }

  const payment = await Payment.findOne({ orderId: order._id }).lean();
  return {
    orderNumber: order.orderNumber,
    total: order.total,
    paymentUrl: payment?.linkUrl || "",
    holdExpiresAt: order.holdExpiresAt?.toISOString(),
    expectedDeliveryWindow: order.expectedDeliveryWindow,
  };
}
