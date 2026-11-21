import { Variant } from "@/lib/db/models/variant";
import { Product } from "@/lib/db/models/product";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Settings } from "@/lib/db/models/settings";
import { calculateDeliveryFee } from "./fees";
import { computeExpectedDeliveryWindow } from "./window";

export async function getQuote({
  items,
  zoneId,
  deliveryMethod = "delivery",
}: {
  items: Array<{ variantId: string; qty: number }>;
  zoneId?: string;
  deliveryMethod?: "delivery" | "pickup";
}) {
  const variantIds = items.map((i) => i.variantId);
  const variants = await Variant.find({ _id: { $in: variantIds } }).lean();
  const products = await Product.find({ _id: { $in: variants.map((v: any) => v.productId) } }).lean();

  const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));
  const variantMap = new Map(variants.map((v: any) => [v._id.toString(), v]));

  const quoteItems: any[] = [];
  let subtotal = 0;

  for (const item of items) {
    const variant = variantMap.get(item.variantId);
    if (!variant) {
      const err: any = new Error("Item unavailable");
      err.code = "ITEM_UNAVAILABLE";
      throw err;
    }
    const product: any = productMap.get((variant.productId as any).toString());
    if (!product || product.status !== "published") {
      const err: any = new Error(`${product?.name || "Item"} is no longer available.`);
      err.code = "ITEM_UNAVAILABLE";
      err.items = [{ slug: product?.slug, name: product?.name }];
      throw err;
    }
    if (!variant.active) {
      const err: any = new Error(`${product.name} is no longer available.`);
      err.code = "ITEM_UNAVAILABLE";
      err.items = [{ slug: product.slug, name: product.name }];
      throw err;
    }

    const unitPrice = variant.salePrice != null && variant.salePrice !== undefined ? variant.salePrice : variant.price || 0;
    const available = variant.madeToOrder ? 999999 : Math.max(0, (variant.stockQty || 0) - (variant.heldQty || 0));
    const soldOut = !variant.madeToOrder && available < item.qty;

    quoteItems.push({
      variantId: variant._id.toString(),
      productId: product._id.toString(),
      slug: product.slug,
      name: product.name,
      label: variant.label || variant.name,
      unitPrice,
      qty: item.qty,
      lineTotal: unitPrice * item.qty,
      available,
      soldOut,
    });
    subtotal += unitPrice * item.qty;
  }

  let zone: any = null;
  if (deliveryMethod === "delivery") {
    if (!zoneId) {
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

  const freeDeliveryGap = freeDeliveryThreshold > 0 && subtotal < freeDeliveryThreshold && deliveryMethod === "delivery" ? freeDeliveryThreshold - subtotal : undefined;

  const maxLeadTimeDays = products.reduce((acc: number, p: any) => Math.max(acc, p.madeToOrder ? p.leadTimeDays || 0 : 0), 0);
  const expectedDeliveryWindow = computeExpectedDeliveryWindow({
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
