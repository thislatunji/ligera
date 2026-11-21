import candle from "@/assets/p-candle.jpg";
import diffuser from "@/assets/p-diffuser.jpg";
import spray from "@/assets/p-spray.jpg";
import gypsum from "@/assets/p-gypsum.jpg";

export const assetSrc = (img: string | { src: string }): string =>
  typeof img === "string" ? img : img.src;

export type Product = {
  id: string;
  variantId?: string;
  slug: string;
  name: string;
  notes: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

export const categories = [
  "All",
  "Candles",
  "Diffusers",
  "Room Sprays",
  "Gypsum Decor",
] as const;

export const productCategories = categories.filter((c) => c !== "All");

const fallbacks: Record<string, string> = {
  Candles: assetSrc(candle),
  Diffusers: assetSrc(diffuser),
  "Room Sprays": assetSrc(spray),
  "Gypsum Decor": assetSrc(gypsum),
};

export const productImage = (product: { category: string; imageUrl?: string | null }) => {
  const url = product.imageUrl?.trim();
  if (url && !url.startsWith("/_next/static/media/p-")) {
    return url;
  }
  return fallbacks[product.category] ?? assetSrc(candle);
};

export const naira = (value: number) =>
  `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export const signatureProducts: Product[] = [
  {
    id: "amber-hush",
    slug: "amber-hush",
    name: "Amber Hush",
    notes: "Amber · Vanilla · Cedar",
    category: "Candles",
    price: 18500,
    stock: 24,
    imageUrl: null,
  },
  {
    id: "linen-morning",
    slug: "linen-morning",
    name: "Linen Morning",
    notes: "Cotton · White Tea · Musk",
    category: "Candles",
    price: 16000,
    stock: 18,
    imageUrl: null,
  },
  {
    id: "saffron-reed",
    slug: "saffron-reed",
    name: "Saffron Reed",
    notes: "Saffron · Oud · Fig",
    category: "Diffusers",
    price: 24000,
    stock: 12,
    imageUrl: null,
  },
  {
    id: "gbagada-dusk",
    slug: "gbagada-dusk",
    name: "Gbagada Dusk",
    notes: "Neroli · Amberwood · Smoke",
    category: "Diffusers",
    price: 26500,
    stock: 10,
    imageUrl: null,
  },
  {
    id: "soft-veil",
    slug: "soft-veil",
    name: "Soft Veil",
    notes: "Peony · Bergamot · Cashmere",
    category: "Room Sprays",
    price: 12000,
    stock: 30,
    imageUrl: null,
  },
  {
    id: "night-bloom",
    slug: "night-bloom",
    name: "Night Bloom",
    notes: "Jasmine · Tonka · Sandalwood",
    category: "Room Sprays",
    price: 13500,
    stock: 22,
    imageUrl: null,
  },
  {
    id: "arch-tray",
    slug: "arch-tray",
    name: "Arch Tray",
    notes: "Hand-poured gypsum",
    category: "Gypsum Decor",
    price: 21000,
    stock: 8,
    imageUrl: null,
  },
  {
    id: "curve-vase",
    slug: "curve-vase",
    name: "Curve Vase",
    notes: "Matte gypsum · Ivory",
    category: "Gypsum Decor",
    price: 19500,
    stock: 6,
    imageUrl: null,
  },
];
