import candle from "@/assets/p-candle.jpg";
import diffuser from "@/assets/p-diffuser.jpg";
import gypsum from "@/assets/p-gypsum.jpg";
import spray from "@/assets/p-spray.jpg";
import { assetSrc } from "@/lib/products";
import type { CustomOrderCategoryValue } from "@/lib/custom-orders";

export type SeoCategorySlug =
  | "scented-candles"
  | "reed-diffusers"
  | "room-linen-sprays"
  | "gypsum-decor";

export interface SeoCategory {
  slug: SeoCategorySlug;
  name: string;
  shortTitle: string;
  headline: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  subtitle: string;
  alt: string;
  posterImage: string;
  customOrderValue: CustomOrderCategoryValue;
  legacyAliases: readonly string[];
}

export const SEO_CATEGORIES: readonly SeoCategory[] = [
  {
    slug: "scented-candles",
    name: "Scented Candles",
    shortTitle: "Scented Candles",
    headline: "Scented Candles in Lagos",
    seoTitle: "Scented Candles in Lagos — Hand-Poured Candles",
    seoDescription:
      "Shop small-batch hand-poured scented candles crafted in Gbagada, Lagos. Clean wax, cotton wicks, Lagos delivery, studio pickup & nationwide Nigeria shipping.",
    intro:
      "Hand-poured in small batches in our Gbagada, Lagos studio using clean-burning wax and hand-trimmed cotton wicks, cured slowly for a warm, lingering scent throw. Available for Lagos dispatch, Gbagada studio pickup, and nationwide delivery across Nigeria.",
    subtitle: "Hand-poured wax · Cotton wicks",
    alt: "Ligera hand-poured scented candles",
    posterImage: assetSrc(candle),
    customOrderValue: "Candles",
    legacyAliases: ["candles", "scented candles", "scented-candles"],
  },
  {
    slug: "reed-diffusers",
    name: "Reed Diffusers",
    shortTitle: "Reed Diffusers",
    headline: "Reed Diffusers in Lagos",
    seoTitle: "Reed Diffusers in Lagos — Long-Lasting Fragrance",
    seoDescription:
      "Buy long-lasting reed diffusers crafted in Lagos by Ligera. Steady flameless home fragrance for bedrooms, living rooms & short-lets across Lagos and Nigeria.",
    intro:
      "Composed with layered top, heart, and base fragrance notes paired with natural reeds for effortless, flameless scenting in homes, offices, and short-let apartments. Fast dispatch across Lagos with studio pickup in Gbagada and nationwide delivery.",
    subtitle: "Steady, effortless atmosphere",
    alt: "Ligera reed diffuser collection",
    posterImage: assetSrc(diffuser),
    customOrderValue: "Diffusers",
    legacyAliases: ["diffusers", "reed diffusers", "reed-diffusers"],
  },
  {
    slug: "room-linen-sprays",
    name: "Room & Linen Sprays",
    shortTitle: "Room and Linen Spray",
    headline: "Room and Linen Sprays in Nigeria",
    seoTitle: "Room & Linen Sprays in Nigeria — Fine Home Mists",
    seoDescription:
      "Discover Ligera room and linen sprays handcrafted in Lagos. Fine mist fragrances for bedding, curtains, and living spaces with Lagos & Nigeria-wide delivery.",
    intro:
      "Fine, lingering fragrance mists made for freshly laundered sheets, pillows, curtains, and living rooms whenever a space calls for an instant reset. Hand-mixed in Gbagada, Lagos and delivered across Lagos and Nigeria.",
    subtitle: "Fine mist for rooms & linens",
    alt: "Ligera room and linen spray collection",
    posterImage: assetSrc(spray),
    customOrderValue: "Room Sprays",
    legacyAliases: [
      "room sprays",
      "room & linen sprays",
      "room and linen spray",
      "room-linen-sprays",
    ],
  },
  {
    slug: "gypsum-decor",
    name: "Gypsum Decor",
    shortTitle: "Gypsum Decor",
    headline: "Handcrafted Gypsum Decor in Lagos",
    seoTitle: "Gypsum Decor in Lagos — Handcrafted Trays & Vases",
    seoDescription:
      "Shop sculptural gypsum trays, ribbed vessels, and curve vases cast, hand-sanded, and sealed in Lagos by Ligera for home styling and gifting across Nigeria.",
    intro:
      "Each arch tray, ribbed vessel, and curve vase is cast in mineral gypsum, hand-sanded smooth, and sealed against water and wax in our Gbagada workbench. Styled alone or paired with our candles and diffusers.",
    subtitle: "Sculpted trays & matte vessels",
    alt: "Handcrafted Ligera gypsum decor trays and vases",
    posterImage: assetSrc(gypsum),
    customOrderValue: "Gypsum Decor",
    legacyAliases: ["gypsum decor", "gypsum-decor"],
  },
] as const;

export function findSeoCategory(input?: string | null): SeoCategory | undefined {
  if (!input) return undefined;
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized || normalized === "all") return undefined;
  return SEO_CATEGORIES.find(
    (cat) =>
      cat.slug === normalized ||
      cat.name.toLowerCase() === normalized ||
      cat.shortTitle.toLowerCase() === normalized ||
      cat.legacyAliases.includes(normalized),
  );
}

export function categoryHref(input?: string | null): string {
  const match = findSeoCategory(input);
  return match ? `/collections/${match.slug}` : "/collections";
}
