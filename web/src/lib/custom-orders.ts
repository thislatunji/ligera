import candle from "@/assets/p-candle.jpg";
import diffuser from "@/assets/p-diffuser.jpg";
import gypsum from "@/assets/p-gypsum.jpg";
import hero from "@/assets/hero.jpg";
import spray from "@/assets/p-spray.jpg";
import { assetSrc } from "@/lib/products";

export const LIGERA_WHATSAPP_NUMBER = "2348096613114";
export const LIGERA_WHATSAPP_DISPLAY = "0809 661 3114";

export const DEFAULT_CUSTOM_ORDER_IMAGE = assetSrc(hero);

export type CustomOrderCategoryValue =
  | "Candles"
  | "Diffusers"
  | "Room Sprays"
  | "Gypsum Decor"
  | "Curated Bundle";

export interface CustomOrderCategoryOption {
  value: CustomOrderCategoryValue;
  label: string;
  description: string;
  placeholder: string;
  image: string;
}

export const CUSTOM_ORDER_CATEGORIES: readonly CustomOrderCategoryOption[] = [
  {
    value: "Candles",
    label: "Candles",
    description:
      "Hand-poured wax in bespoke vessels, custom labels, or signature scents.",
    placeholder:
      "Tell us about your preferred scents, jar style, custom label wording, quantity, or event date…",
    image: assetSrc(candle),
  },
  {
    value: "Diffusers",
    label: "Diffusers",
    description:
      "Tailored fragrance oils and reed sets for homes, offices, and short-lets.",
    placeholder:
      "Tell us about your space, preferred fragrance notes, bottle finish, quantity, or timeline…",
    image: assetSrc(diffuser),
  },
  {
    value: "Room Sprays",
    label: "Room Sprays",
    description:
      "Custom room and linen mist accords composed for your atmosphere.",
    placeholder:
      "Share your desired scent profile, bottle size, labeling needs, quantity, or delivery date…",
    image: assetSrc(spray),
  },
  {
    value: "Gypsum Decor",
    label: "Gypsum Decor",
    description:
      "Sculpted trays, ribbed vessels, and curve vases cast in custom tones.",
    placeholder:
      "Describe the pieces, colors or marbled finishes, dimensions, quantity, or occasion…",
    image: assetSrc(gypsum),
  },
  {
    value: "Curated Bundle",
    label: "Curated Bundle",
    description:
      "Paired candles, diffusers, sprays, and gypsum pieces for gifting or events.",
    placeholder:
      "Tell us what you'd like paired together, recipient or event details, quantity, and target date…",
    image: assetSrc(hero),
  },
];

/** Match a query string or product name case-insensitively to a custom order category. */
export function findCustomOrderCategory(
  value: string,
): CustomOrderCategoryOption | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return CUSTOM_ORDER_CATEGORIES.find(
    (category) => category.value.toLowerCase() === normalized,
  );
}

/** Format the pre-filled WhatsApp message for a custom order inquiry. */
export function buildCustomOrderWhatsAppMessage(
  product: string,
  details: string,
): string {
  return [
    "Hello Ligera, I would like to place a custom order.",
    "",
    `Product: ${product.trim()}`,
    `Details: ${details.trim()}`,
  ].join("\n");
}

/** Build the wa.me URL with an encoded pre-filled message for Ligera. */
export function buildCustomOrderWhatsAppUrl(
  product: string,
  details: string,
): string {
  const message = buildCustomOrderWhatsAppMessage(product, details);
  return `https://wa.me/${LIGERA_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
