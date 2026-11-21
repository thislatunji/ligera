export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://ligerascents.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Ligera";
export const SITE_TAGLINE = "Illuminate Every Space";
export const SITE_DESCRIPTION =
  "Lagos home fragrance house in Gbagada crafting hand-poured scented candles, reed diffusers, room & linen sprays, and sculpted gypsum decor. Lagos-first delivery, nationwide Nigeria shipping & studio pickup.";

export const SITE_EMAIL = "orders@ligerascents.com";
export const STUDIO_PHONE_DISPLAY = "0809 661 3114";
export const STUDIO_PHONE_E164 = "+2348096613114";
export const STUDIO_WHATSAPP_NUMBER = "2348096613114";

export const STUDIO_INSTAGRAM_HANDLE = "@ligera.est26";
export const STUDIO_INSTAGRAM_URL = "https://www.instagram.com/ligera.est26/";

export const STUDIO_HOURS_DISPLAY = "Mon–Sat, 9:00 AM – 6:00 PM WAT";

export const STUDIO_ADDRESS = {
  streetAddress: "43 Onabola Street, Pedro Road",
  addressLocality: "Gbagada",
  addressRegion: "Lagos",
  addressCountry: "NG",
  formatted: "43 Onabola Street, Pedro Road, Gbagada, Lagos",
} as const;

export const STUDIO_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=43+Onabola+Street%2C+Pedro+Road%2C+Gbagada%2C+Lagos";
export const STUDIO_MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s43+Onabola+Street,+Pedro+Road,+Gbagada,+Lagos!6i16";

export const DEFAULT_OG_IMAGE = "/hero-poster.jpg";

export const AREA_SERVED = [
  "Gbagada, Lagos",
  "Ikeja, Lagos",
  "Lekki, Lagos",
  "Victoria Island, Lagos",
  "Ikoyi, Lagos",
  "Surulere, Lagos",
  "Lagos, Nigeria",
  "Nigeria",
] as const;

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "/" : normalized}`;
}
