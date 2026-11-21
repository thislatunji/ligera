import mongoose from "mongoose";
import { Variant } from "@/lib/db/models/variant";
import { Product } from "@/lib/db/models/product";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { Customer } from "@/lib/db/models/customer";
import { Settings } from "@/lib/db/models/settings";
import { nextNumber } from "@/lib/db/models/counter";
import { createPaymentLink } from "@/lib/integrations/flutterwave";
import { calculateDeliveryFee } from "./fees";
import { computeExpectedDeliveryWindow } from "./window";

export async function placeOrder(input: any) {
  const session = await mongoose.startSession();
  try {
    // We'll do most operations outside transaction if needed, but try to be careful
    // Load variants and products
    const variantIds = input.items.map((i: any) => i.variantId);
    const variants = await Variant.find({ _id: { $in: variantIds } }).lean();
    const products = await Product.find({ _id: { $in: variants.map((v: any) => v.productId) } }).lean();

    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));
    const variantMap = new Map(variants.map((v: any) => [v._id.toString(), v]));

    // Check items exist and are available
    for (const item of input.items) {
      const variant: any = variantMap.get(item.variantId);
      if (!variant || !variant.active) {
        const err: any = new Error("Item unavailable");
        err.code = "ITEM_UNAVAILABLE";
        throw err;
      }
      const product: any = productMap.get(variant.productId.toString());
      if (!product || product.status !== "published") {
        const err: any = new Error(`${product?.name || "Item"} is no longer available.`);
        err.code = "ITEM_UNAVAILABLE";
        err.items = [{ slug: product?.slug, name: product?.name }];
        throw err;
      }
    }

    // Validate delivery
    if (input.deliveryMethod === "delivery") {
      if (!input.address || !input.zoneId) {
        const err: any = new Error("Choose a delivery zone.");
        err.code = "ZONE_INVALID";
        throw err;
      }
    }

    // Reserve stock atomically
    const reserved: Array<{ variantId: any; qty: number }> = [];
    try {
      for (const item of input.items) {
        const variant: any = variantMap.get(item.variantId);
        if (variant.madeToOrder) {
          continue; // skip reservation
        }
        const updated = await Variant.findOneAndUpdate(
          {
            _id: variant._id,
            active: true,
            $expr: { $gte: [{ $subtract: ["$stockQty", "$heldQty"] }, item.qty] },
          },
          { $inc: { heldQty: item.qty } },
          { new: true }
        );
        if (!updated) {
          // Failed to reserve - compensate
          throw new Error("STOCK_SOLD_OUT");
        }
        reserved.push({ variantId: variant._id, qty: item.qty });
      }
    } catch (e: any) {
      // Compensate reserved
      for (const r of reserved) {
        try {
          await Variant.findByIdAndUpdate(r.variantId, { $inc: { heldQty: -r.qty } });
        } catch (_) {}
      }
      if (e.message === "STOCK_SOLD_OUT") {
        // Find which item failed
        const failedItems: any[] = [];
        for (const item of input.items) {
          const variant: any = variantMap.get(item.variantId);
          if (variant?.madeToOrder) continue;
          const v = await Variant.findById(variant._id).lean();
          const available = v ? Math.max(0, (v.stockQty || 0) - (v.heldQty || 0)) : 0;
          if (available < item.qty) {
            const product: any = productMap.get(variant.productId.toString());
            failedItems.push({ slug: product?.slug, name: product ? `${product.name} — ${variant.label || variant.sku}` : variant.label || variant.sku });
          }
        }
        const err: any = new Error("Some items just sold out. Please remove it to continue.");
        err.code = "STOCK_SOLD_OUT";
        err.items = failedItems.length ? failedItems : input.items.map((i: any) => ({ name: i.variantId }));
        throw err;
      }
      throw e;
    }

    // Get zone and calculate fees
    let zone: any = null;
    if (input.deliveryMethod === "delivery" && input.zoneId) {
      zone = await DeliveryZone.findById(input.zoneId).lean();
    }
    const settings: any = await Settings.findOne().lean();
    const freeDeliveryThreshold = settings?.delivery?.freeDeliveryThreshold || 0;

    // Build order items snapshot
    let subtotal = 0;
    const orderItems = input.items.map((item: any) => {
      const variant: any = variantMap.get(item.variantId);
      const product: any = productMap.get(variant.productId.toString());
      const unitPrice = variant.salePrice != null && variant.salePrice !== undefined ? variant.salePrice : variant.price || 0;
      subtotal += unitPrice * item.qty;
      return {
        variantId: variant._id,
        productId: product._id,
        name: product.name,
        sku: variant.sku,
        unitPrice,
        qty: item.qty,
        imageUrl: product.images?.[0]?.publicId ? undefined : product.images?.[0]?.url || product.images?.[0]?.alt || undefined,
      };
    });

    const deliveryFee = calculateDeliveryFee({
      deliveryMethod: input.deliveryMethod || "delivery",
      subtotal,
      zoneFee: zone?.fee || 0,
      freeDeliveryThreshold,
    });
    const total = subtotal + deliveryFee;

    const maxLeadTimeDays = products.reduce((acc: number, p: any) => Math.max(acc, p.madeToOrder ? p.leadTimeDays || 0 : 0), 0);
    const expectedDeliveryWindow = computeExpectedDeliveryWindow({
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
      deliveryMethod: input.deliveryMethod || "delivery",
      deliveryZoneId: zone?._id || input.zoneId || null,
      deliveryZoneName: zone?.name || "",
      deliveryAddress: input.address || undefined,
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
      provider: "flutterwave",
      reference: orderNumber,
      amount: total,
      currency: "NGN",
      status: "pending",
    });

    // Create payment link
    const appUrl = process.env.APP_URL || "http://localhost:3000";
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
      });
      if (result.link) {
        await Payment.findOneAndUpdate({ orderId: order._id }, { linkUrl: result.link, linkId: result.linkId });
      }
    } catch (err) {
      // Release holds, delete order and payment
      for (const r of reserved) {
        try {
          await Variant.findByIdAndUpdate(r.variantId, { $inc: { heldQty: -r.qty } });
        } catch (_) {}
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
  } finally {
    session.endSession();
  }
}
