import mongoose from "mongoose";
import { Variant } from "@/lib/db/models/variant";
import { Product } from "@/lib/db/models/product";

export interface ResolvedCheckoutLine {
  variant: any;
  product: any;
  variantId: string;
  qty: number;
  madeToOrder: boolean;
}

export async function resolveCheckoutItems(
  items: Array<{ variantId: string; qty: number }>
): Promise<ResolvedCheckoutLine[]> {
  const rawIds = items.map((i) => String(i.variantId || "").trim());
  const validObjectIds = rawIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const slugCandidates = rawIds.filter(
    (id) => id.length > 0 && !mongoose.Types.ObjectId.isValid(id)
  );

  const variantsById = validObjectIds.length
    ? await Variant.find({ _id: { $in: validObjectIds } }).lean()
    : [];

  const slugProducts = slugCandidates.length
    ? await Product.find({
        slug: { $in: slugCandidates },
        status: "published",
      }).lean()
    : [];

  const slugProductIds = slugProducts.map((p: any) => p._id);
  const slugVariants = slugProductIds.length
    ? await Variant.find({ productId: { $in: slugProductIds }, active: true })
        .sort({ createdAt: 1 })
        .lean()
    : [];

  const slugProductBySlug = new Map<string, any>(
    slugProducts.map((p: any) => [String(p.slug), p])
  );
  const firstVariantByProductId = new Map<string, any>();
  for (const v of slugVariants as any[]) {
    const pid = v.productId.toString();
    if (!firstVariantByProductId.has(pid)) {
      firstVariantByProductId.set(pid, v);
    }
  }

  const allVariants = [...(variantsById as any[]), ...(slugVariants as any[])];
  const allProductIds = Array.from(
    new Set(allVariants.map((v: any) => v.productId?.toString()).filter(Boolean))
  );
  const products = allProductIds.length
    ? await Product.find({ _id: { $in: allProductIds } }).lean()
    : [];

  const productMap = new Map<string, any>(
    (products as any[]).map((p: any) => [p._id.toString(), p])
  );
  const variantMap = new Map<string, any>(
    (variantsById as any[]).map((v: any) => [v._id.toString(), v])
  );

  const resolved: ResolvedCheckoutLine[] = [];

  for (const item of items) {
    const rawId = String(item.variantId || "").trim();
    let variant: any = null;

    if (mongoose.Types.ObjectId.isValid(rawId)) {
      variant = variantMap.get(rawId) || null;
    } else if (rawId) {
      const slugProd = slugProductBySlug.get(rawId);
      if (slugProd) {
        variant = firstVariantByProductId.get(slugProd._id.toString()) || null;
        if (!variant) {
          const err: any = new Error(
            `${slugProd.name || "Item"} is no longer available.`
          );
          err.code = "ITEM_UNAVAILABLE";
          err.items = [{ slug: slugProd.slug, name: slugProd.name }];
          throw err;
        }
      }
    }

    if (!variant) {
      const err: any = new Error("Item unavailable");
      err.code = "ITEM_UNAVAILABLE";
      throw err;
    }

    const product: any = productMap.get(variant.productId.toString());
    if (!product || product.status !== "published" || !variant.active) {
      const err: any = new Error(
        `${product?.name || "Item"} is no longer available.`
      );
      err.code = "ITEM_UNAVAILABLE";
      err.items = [{ slug: product?.slug, name: product?.name }];
      throw err;
    }

    resolved.push({
      variant,
      product,
      variantId: variant._id.toString(),
      qty: item.qty,
      madeToOrder: Boolean(variant.madeToOrder || product.madeToOrder),
    });
  }

  return resolved;
}
