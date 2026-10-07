import candle from "@/assets/p-candle.jpg";
import diffuser from "@/assets/p-diffuser.jpg";
import spray from "@/assets/p-spray.jpg";
import gypsum from "@/assets/p-gypsum.jpg";

export type Product = {
  id: string;
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
  Candles: candle,
  Diffusers: diffuser,
  "Room Sprays": spray,
  "Gypsum Decor": gypsum,
};

export const productImage = (product: { category: string; imageUrl?: string | null }) =>
  product.imageUrl ?? fallbacks[product.category] ?? candle;

export const naira = (value: number) =>
  `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
