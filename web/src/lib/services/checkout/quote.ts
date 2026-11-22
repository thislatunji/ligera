import mongoose from "mongoose";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Settings } from "@/lib/db/models/settings";
import { calculateDeliveryFee } from "./fees";
import { computeExpectedDeliveryWindow } from "./window";
import { resolveCheckoutItems } from "./resolve-items";

export async function getQuote({
  items,
  zoneId,
  deliveryMethod = "delivery",
}: {
  items: Array<{ variantId: string; qty: number }>;
  zoneId?: string;
  deliveryMethod?: "delivery" | "pickup";
}) {
  const resolvedLines = await resolveCheckoutItems(items);

  const quoteItems: any[] = [];
  let subtotal = 0;

  for (const line of resolvedLines) {
    const { variant, product, qty, madeToOrder } = line;
    const unitPrice =
      variant.salePrice != null && variant.salePrice !== undefined
        ? variant.salePrice
        : variant.price || 0;
    const available = madeToOrder
      ? 999999
      : Math.max(0, (variant.stockQty || 0) - (variant.heldQty || 0));
    const soldOut = !madeToOrder && available < qty;

    quoteItems.push({
      variantId: variant._id.toString(),
      productId: product._id.toString(),
      slug: product.slug,
      name: product.name,
      label: variant.label || variant.name,
      unitPrice,
      qty,
      lineTotal: unitPrice * qty,
      available,
      soldOut,
    });
    subtotal += unitPrice * qty;
  }

  let zone: any = null;
  if (deliveryMethod === "delivery") {
    if (!zoneId || !mongoose.Types.ObjectId.isValid(String(zoneId))) {
      const err: any = new Error("Choose a delivery zone.");
      err.code = "ZONE_INVALID";
      throw err;
    }
    zone = await DeliveryZone.findOne({ _id: zoneId, active: true }).lean();
    if (!zone) {
      const err: any = new Error("Choose a delivery zone.");
      err.code = "ZONE_INVALID";
      throw err;
    }
  }

  const settings: any = await Settings.findOne().lean();
  const freeDeliveryThreshold = settings?.delivery?.freeDeliveryThreshold || 0;
  const deliveryFee = calculateDeliveryFee({
    deliveryMethod,
    subtotal,
    zoneFee: zone?.fee || 0,
    freeDeliveryThreshold,
  });

  const freeDeliveryGap =
    freeDeliveryThreshold > 0 &&
    subtotal < freeDeliveryThreshold &&
    deliveryMethod === "delivery"
      ? freeDeliveryThreshold - subtotal
      : undefined;

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

  const total = subtotal + deliveryFee;

  return {
    items: quoteItems,
    subtotal,
    deliveryFee,
    total,
    freeDeliveryGap,
    expectedDeliveryWindow,
  };
}
