import { naira } from "@/lib/products";
import {
  getDeliveryZonesSafe,
  getPublicProductsSafe,
} from "@/lib/seo/catalog.server";
import { SEO_CATEGORIES } from "@/lib/seo/categories";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  STUDIO_ADDRESS,
  STUDIO_HOURS_DISPLAY,
  STUDIO_INSTAGRAM_HANDLE,
  STUDIO_INSTAGRAM_URL,
  STUDIO_PHONE_DISPLAY,
  STUDIO_PHONE_E164,
  absoluteUrl,
} from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const [products, zones] = await Promise.all([
    getPublicProductsSafe(),
    getDeliveryZonesSafe(),
  ]);

  const lines: string[] = [
    `# ${SITE_NAME} — ${SITE_TAGLINE}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Studio & Contact",
    `- Website: ${absoluteUrl("/")}`,
    `- Studio Address: ${STUDIO_ADDRESS.formatted}`,
    `- Studio Hours: ${STUDIO_HOURS_DISPLAY}`,
    `- Studio Pickup: Available at our Gbagada, Lagos studio`,
    `- Phone / WhatsApp: ${STUDIO_PHONE_DISPLAY} (${STUDIO_PHONE_E164})`,
    `- Instagram: ${STUDIO_INSTAGRAM_HANDLE} (${STUDIO_INSTAGRAM_URL})`,
    "",
    "## Product Collections",
    ...SEO_CATEGORIES.map(
      (cat) => `- [${cat.headline}](${absoluteUrl(`/collections/${cat.slug}`)}): ${cat.subtitle}`,
    ),
    "",
    "## Catalog",
    ...products.map(
      (p) =>
        `- [${p.name}](${absoluteUrl(`/products/${p.slug}`)}) — ${p.category} · ${naira(p.price)} · ${p.notes}`,
    ),
    "",
    "## Delivery & Pickup",
    "- Delivery Coverage: Lagos-first zone delivery (2–3 working days) plus nationwide shipping across Nigeria (Abuja, Port Harcourt, Ibadan, and more).",
    "- Studio Pickup: Available in Gbagada, Lagos (Mon–Sat, 9:00 AM – 6:00 PM WAT).",
    ...zones.map(
      (z) => `- ${z.name}: ${z.etaText || "2–3 working days"}`,
    ),
    "",
    "## Bespoke & Custom Orders",
    `- [Custom Orders](${absoluteUrl("/custom-orders")}): Tailored scented candles, reed diffusers, room & linen sprays, gypsum trays/vases, wedding favors, corporate gifting, and short-let residence scenting.`,
    "",
    "## Guides & Policies",
    `- [Our Story](${absoluteUrl("/our-story")})`,
    `- [Visit Our Studio](${absoluteUrl("/visit-us")})`,
    `- [Delivery & Returns](${absoluteUrl("/delivery-returns")})`,
    `- [FAQs](${absoluteUrl("/faqs")})`,
    `- [Candle Safety & Care](${absoluteUrl("/candle-safety")})`,
    `- [Privacy Policy](${absoluteUrl("/privacy")})`,
    `- [Terms & Conditions](${absoluteUrl("/terms")})`,
  ];

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
