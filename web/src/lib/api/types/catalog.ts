export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  categorySlug?: string;
  priceFrom: number;
  badge: "in_stock" | "low_stock" | "sold_out" | "made_to_order";
  imageUrl: string;
  imageAlt: string;
}

export interface ProductDetail extends ProductCard {
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
  pairsWith: ProductCard[];
  seo: { title: string; metaDescription: string };
}

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  category?: { id: string; name: string };
  variants: {
    id: string;
    label: string;
    sku: string;
    price: number;
    salePrice: number | null;
    stockQty: number;
    heldQty: number;
    available: number;
    lowStockThreshold: number;
    costPrice?: number;
    active: boolean;
  }[];
  lowStock: boolean;
  imageThumb?: string;
  updatedAt: string;
}

export interface LowStockRow {
  variantId: string;
  product: { id: string; name: string; slug: string };
  label: string;
  sku: string;
  available: number;
  lowStockThreshold: number;
  soldOut: boolean;
}

export interface ImportReport {
  created: number;
  updated: number;
  failed: number;
  failures: { row: number; error: string }[];
}
