import { z } from "zod";

export const ProductQuery = z.object({
  category: z.string().optional(),
  space: z.string().optional(),
  q: z.string().trim().max(120).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "popular"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(24),
});
export type ProductQuery = z.infer<typeof ProductQuery>;

export const VariantInput = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(60),
  sku: z.string().trim().min(1).max(40),
  price: z.number().int().min(0),
  salePrice: z.number().int().min(0).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).max(10000).default(5),
  costPrice: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const ProductUpsert = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(4000).default(""),
  categoryId: z.string().nullable(),
  spaceTagIds: z.array(z.string()).max(7).default([]),
  scentNotes: z
    .object({
      top: z.array(z.string().trim().max(40)).max(6).default([]),
      heart: z.array(z.string().trim().max(40)).max(6).default([]),
      base: z.array(z.string().trim().max(40)).max(6).default([]),
    })
    .default({ top: [], heart: [], base: [] }),
  ingredients: z.string().max(2000).default(""),
  safetyInfo: z.string().max(2000).default(""),
  burnTime: z.string().max(60).default(""),
  dimensions: z.string().max(60).default(""),
  finish: z.string().max(60).default(""),
  madeToOrder: z.boolean().default(false),
  leadTimeDays: z.number().int().min(0).max(120).default(0),
  images: z
    .array(
      z.object({
        publicId: z.string().min(1),
        alt: z.string().trim().min(3).max(160),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        position: z.number().int().min(0),
      })
    )
    .max(12)
    .default([]),
  pairsWith: z.array(z.string()).max(4).default([]),
  seo: z
    .object({
      title: z.string().max(70).default(""),
      metaDescription: z.string().max(160).default(""),
      ogImage: z.string().default(""),
    })
    .default({ title: "", metaDescription: "", ogImage: "" }),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  variants: z.array(VariantInput).min(1).max(20),
});

export const StockAdjustmentInput = z.object({
  change: z.number().int().refine((n) => n !== 0, "Change must not be zero"),
  reason: z.enum(["restock", "damaged", "sample", "correction"]),
  note: z.string().max(500).default(""),
});

export const CategoryInput = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["category", "space", "collection"]),
  parentId: z.string().nullable().optional(),
  description: z.string().max(500).default(""),
  image: z.object({ publicId: z.string(), alt: z.string() }).nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const AdminProductQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  lowStock: z.coerce.boolean().optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AdminProductQuery = z.infer<typeof AdminProductQuery>;
