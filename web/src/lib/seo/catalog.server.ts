import { connectDb } from "@/lib/db/connect";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Product as ProductModel } from "@/lib/db/models/product";
import { getContentPage } from "@/lib/services/admin/content";
import { getProductBySlug, listProducts } from "@/lib/services/catalog/queries";
import {
  productImage,
  signatureProducts,
  type Product,
} from "@/lib/products";
import {
  DEFAULT_DELIVERY_ZONES,
  FALLBACK_PRODUCT_DETAILS,
  type DeliveryZoneDefault,
} from "./content-defaults";
import { findSeoCategory } from "./categories";

export interface PublicProduct extends Product {
  updatedAt?: string;
}

export interface ProductDetailData {
  id: string;
  variantId?: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  priceFrom: number;
  badge: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
  scentNotes: { top: string[]; heart: string[]; base: string[] };
  ingredients: string;
  safetyInfo: string;
  burnTime: string;
  dimensions: string;
  finish: string;
  madeToOrder: boolean;
  leadTimeDays: number;
  images: { url: string; alt: string; width: number; height: number }[];
  variants: {
    id: string;
    label: string;
    price: number;
    salePrice: number | null;
    available: number;
    lowStock: boolean;
    soldOut: boolean;
  }[];
  pairsWith: {
    id: string;
    slug: string;
    name: string;
    priceFrom: number;
    badge: string;
    imageUrl: string;
    imageAlt: string;
  }[];
  seo: { title?: string; metaDescription?: string; ogImage?: string };
}

function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== "");
}

function fallbackProductList(): PublicProduct[] {
  return signatureProducts.map((p) => ({
    ...p,
    imageUrl: p.imageUrl ?? null,
  }));
}

export async function getPublicProductsSafe(): Promise<PublicProduct[]> {
  if (!hasDatabaseConfigured()) {
    return fallbackProductList();
  }

  try {
    const result = await listProducts({ page: 1, limit: 100 });
    if (!result?.data || result.data.length === 0) {
      return fallbackProductList();
    }

    let updatedMap = new Map<string, string>();
    try {
      await connectDb();
      const docs = await ProductModel.find({ status: "published" })
        .select("slug updatedAt")
        .lean();
      for (const doc of docs as any[]) {
        if (doc.slug && doc.updatedAt) {
          updatedMap.set(doc.slug, new Date(doc.updatedAt).toISOString());
        }
      }
    } catch {
      // ignore optional updatedAt lookup failure
    }

    return result.data.map((p: any) => ({
      id: p.id,
      variantId: p.variantId,
      slug: p.slug,
      name: p.name,
      notes: p.notes ?? "",
      category: p.category ?? "Candles",
      price: p.price ?? p.priceFrom ?? 0,
      stock: p.stock ?? (p.badge === "sold_out" ? 0 : 10),
      imageUrl: p.imageUrl || null,
      updatedAt: updatedMap.get(p.slug),
    }));
  } catch {
    return fallbackProductList();
  }
}

function buildFallbackProductDetail(slug: string): ProductDetailData | null {
  const base = signatureProducts.find((p) => p.slug === slug);
  if (!base) return null;

  const detail = FALLBACK_PRODUCT_DETAILS[slug];
  const resolvedImage = productImage(base);
  const seoCat = findSeoCategory(base.category);

  return {
    id: base.id,
    variantId: base.variantId,
    slug: base.slug,
    name: base.name,
    category: seoCat?.name ?? base.category,
    categorySlug: seoCat?.slug ?? "scented-candles",
    priceFrom: base.price,
    badge: base.stock > 0 ? "in_stock" : "sold_out",
    imageUrl: resolvedImage,
    imageAlt: `${base.name} — ${seoCat?.name ?? base.category} by Ligera`,
    description:
      detail?.description ??
      `${base.name} (${base.notes}) — handcrafted in small batches at our Gbagada, Lagos studio.`,
    scentNotes: detail?.scentNotes ?? { top: [], heart: [], base: [] },
    ingredients: "",
    safetyInfo: detail?.safetyInfo ?? "",
    burnTime: "",
    dimensions: "",
    finish: detail?.finish ?? base.notes,
    madeToOrder: false,
    leadTimeDays: 0,
    images: [
      {
        url: resolvedImage,
        alt: `${base.name} — ${seoCat?.name ?? base.category} by Ligera`,
        width: 900,
        height: 900,
      },
    ],
    variants: [
      {
        id: base.variantId ?? base.id,
        label: "Standard",
        price: base.price,
        salePrice: null,
        available: base.stock,
        lowStock: base.stock > 0 && base.stock <= 5,
        soldOut: base.stock <= 0,
      },
    ],
    pairsWith: [],
    seo: {
      title: `${base.name} — ${seoCat?.name ?? base.category} in Lagos`,
      metaDescription: `Buy ${base.name} (${base.notes}) from Ligera in Lagos for ₦${base.price.toLocaleString("en-NG")}. Handcrafted in Gbagada with Lagos delivery, studio pickup, and nationwide Nigeria shipping.`,
    },
  };
}

export async function getProductDetailSafe(
  slug: string,
): Promise<ProductDetailData | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  if (!hasDatabaseConfigured()) {
    return buildFallbackProductDetail(normalizedSlug);
  }

  try {
    const dbProduct = await getProductBySlug(normalizedSlug);
    if (!dbProduct) {
      return buildFallbackProductDetail(normalizedSlug);
    }

    await connectDb();
    const rawDoc = (await ProductModel.findOne({
      slug: normalizedSlug,
      status: "published",
    })
      .populate("categoryId", "name slug")
      .lean()) as any;

    const categoryName = rawDoc?.categoryId?.name || "Candles";
    const seoCat = findSeoCategory(categoryName);
    const resolvedFallbackImage = productImage({
      category: seoCat?.name ?? categoryName,
      imageUrl: dbProduct.imageUrl,
    });
    const finalImage = dbProduct.imageUrl || resolvedFallbackImage;

    return {
      ...dbProduct,
      variantId: dbProduct.variants?.[0]?.id,
      category: seoCat?.name ?? categoryName,
      categorySlug: seoCat?.slug ?? "scented-candles",
      imageUrl: finalImage,
      images:
        dbProduct.images && dbProduct.images.length > 0
          ? dbProduct.images
          : [
              {
                url: finalImage,
                alt: dbProduct.imageAlt || dbProduct.name,
                width: 900,
                height: 900,
              },
            ],
      pairsWith: (dbProduct.pairsWith || []).map((pair: any) => ({
        ...pair,
        imageUrl:
          pair.imageUrl ||
          productImage({ category: seoCat?.name ?? "Candles", imageUrl: null }),
      })),
    };
  } catch {
    return buildFallbackProductDetail(normalizedSlug);
  }
}

export async function getDeliveryZonesSafe(): Promise<DeliveryZoneDefault[]> {
  if (!hasDatabaseConfigured()) {
    return DEFAULT_DELIVERY_ZONES;
  }

  try {
    await connectDb();
    const zones = await DeliveryZone.find({ active: true })
      .sort({ sortOrder: 1 })
      .lean();
    if (!zones || zones.length === 0) {
      return DEFAULT_DELIVERY_ZONES;
    }
    return zones.map((z: any) => ({
      id: z._id.toString(),
      name: z.name,
      fee: z.fee,
      etaText: z.etaText || "2–3 working days",
    }));
  } catch {
    return DEFAULT_DELIVERY_ZONES;
  }
}

export interface SafeContentPage {
  slug: string;
  title: string;
  sections: {
    heading: string;
    body: string;
    image?: { url: string; alt: string };
  }[];
  seo?: { title?: string; metaDescription?: string };
  updatedAt?: string;
}

export async function getContentPageSafe(
  slug: string,
): Promise<SafeContentPage | null> {
  if (!hasDatabaseConfigured()) {
    return null;
  }
  try {
    const page = await getContentPage(slug, false);
    return page as SafeContentPage;
  } catch {
    return null;
  }
}
