import { naira } from "@/lib/products";
import {
  getContentPageSafe,
  getDeliveryZonesSafe,
  getProductDetailSafe,
  getPublicProductsSafe,
  type ProductDetailData,
} from "@/lib/seo/catalog.server";
import { SEO_CATEGORIES } from "@/lib/seo/categories";
import {
  DEFAULT_CANDLE_SAFETY_SECTIONS,
  DEFAULT_CUSTOM_ORDER_FAQS,
  DEFAULT_FAQS,
  DEFAULT_RETURNS_SECTIONS,
  type FaqEntry,
} from "@/lib/seo/content-defaults";
import {
  AREA_SERVED,
  SITE_DESCRIPTION,
  SITE_EMAIL,
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

function formatProductAvailability(detail: ProductDetailData): string {
  if (detail.madeToOrder) {
    return detail.leadTimeDays > 0
      ? `Made to order (${detail.leadTimeDays} days)`
      : "Made to order";
  }
  return detail.badge === "sold_out" ? "Sold out" : "In stock";
}

function formatVariantSummary(detail: ProductDetailData): string {
  if (!detail.variants || detail.variants.length === 0) {
    return naira(detail.priceFrom);
  }
  if (detail.variants.length === 1) {
    const v = detail.variants[0];
    const eff = v.salePrice ?? v.price;
    return `${naira(eff)} (${v.label})`;
  }
  return detail.variants
    .map((v) => {
      const eff = v.salePrice ?? v.price;
      const stockLabel = detail.madeToOrder
        ? "made to order"
        : v.soldOut
          ? "sold out"
          : "in stock";
      return `${v.label}: ${naira(eff)} (${stockLabel})`;
    })
    .join("; ");
}

export async function GET() {
  const [products, zones, cmsFaqsPage, cmsSafetyPage, cmsReturnsPage] =
    await Promise.all([
      getPublicProductsSafe(),
      getDeliveryZonesSafe(),
      getContentPageSafe("faqs"),
      getContentPageSafe("candle-safety"),
      getContentPageSafe("returns"),
    ]);

  const details = (
    await Promise.all(products.map((p) => getProductDetailSafe(p.slug)))
  ).filter((d): d is ProductDetailData => d !== null);

  const cmsFaqs: FaqEntry[] =
    cmsFaqsPage?.sections
      ?.filter((s) => s.heading?.trim() && s.body?.trim())
      .map((s) => ({ question: s.heading.trim(), answer: s.body.trim() })) ?? [];

  const mergedFaqs =
    cmsFaqs.length >= DEFAULT_FAQS.length
      ? cmsFaqs
      : [
          ...DEFAULT_FAQS,
          ...cmsFaqs.filter(
            (c) =>
              !DEFAULT_FAQS.some(
                (d) => d.question.toLowerCase() === c.question.toLowerCase(),
              ),
          ),
        ];

  const safetySections =
    cmsSafetyPage?.sections && cmsSafetyPage.sections.length > 1
      ? cmsSafetyPage.sections
      : DEFAULT_CANDLE_SAFETY_SECTIONS;

  const returnsSections =
    cmsReturnsPage?.sections && cmsReturnsPage.sections.length > 0
      ? cmsReturnsPage.sections
      : DEFAULT_RETURNS_SECTIONS;

  const lines: string[] = [
    `# ${SITE_NAME} — ${SITE_TAGLINE} (Full Reference)`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Brand & Studio NAP",
    `- Name: ${SITE_NAME}`,
    `- Website: ${absoluteUrl("/")}`,
    `- Address: ${STUDIO_ADDRESS.formatted}`,
    `- Hours: ${STUDIO_HOURS_DISPLAY}`,
    `- Phone / WhatsApp: ${STUDIO_PHONE_DISPLAY} (${STUDIO_PHONE_E164})`,
    `- Email: ${SITE_EMAIL}`,
    `- Instagram: ${STUDIO_INSTAGRAM_HANDLE} (${STUDIO_INSTAGRAM_URL})`,
    `- Service Area: ${AREA_SERVED.join(", ")}`,
    `- Currency: Nigerian Naira (NGN / ₦)`,
    `- Online Payments: Card & Bank Transfer via Flutterwave`,
    "",
    "## Product Collections",
    ...SEO_CATEGORIES.flatMap((cat) => [
      `### [${cat.headline}](${absoluteUrl(`/collections/${cat.slug}`)})`,
      cat.intro,
      "",
    ]),
    "## Full Catalog Details",
    ...details.flatMap((d) => {
      const productLines = [
        `### [${d.name}](${absoluteUrl(`/products/${d.slug}`)})`,
        `- Category: ${d.category}`,
        `- Price / Options: ${formatVariantSummary(d)}`,
        `- Availability: ${formatProductAvailability(d)}`,
      ];
      if (d.description) productLines.push(`- Description: ${d.description}`);
      if (d.scentNotes.top.length > 0) {
        productLines.push(`- Top Notes: ${d.scentNotes.top.join(", ")}`);
      }
      if (d.scentNotes.heart.length > 0) {
        productLines.push(`- Heart Notes: ${d.scentNotes.heart.join(", ")}`);
      }
      if (d.scentNotes.base.length > 0) {
        productLines.push(`- Base Notes: ${d.scentNotes.base.join(", ")}`);
      }
      if (d.finish) productLines.push(`- Finish / Format: ${d.finish}`);
      if (d.burnTime) productLines.push(`- Burn Time: ${d.burnTime}`);
      if (d.dimensions) productLines.push(`- Dimensions: ${d.dimensions}`);
      if (d.ingredients) productLines.push(`- Materials / Ingredients: ${d.ingredients}`);
      if (d.safetyInfo) productLines.push(`- Care & Safety: ${d.safetyInfo}`);
      productLines.push("");
      return productLines;
    }),
    "## Delivery Zones & Studio Pickup",
    "- Lagos-first dispatch across our delivery zones (typically 2–3 working days) plus nationwide interstate courier shipping across Nigeria (Abuja, Port Harcourt, Ibadan, and more).",
    `- Gbagada Studio Pickup: ${STUDIO_ADDRESS.formatted} (${STUDIO_HOURS_DISPLAY}).`,
    ...zones.map(
      (z) => `- ${z.name}: ${z.etaText || "2–3 working days"}`,
    ),
    "",
    "## Bespoke & Custom Orders",
    `- Page: ${absoluteUrl("/custom-orders")}`,
    "- What We Craft To Order: Custom-labeled scented candles, mini reed diffusers, room & linen sprays, sealed mineral gypsum trays & vessels, and curated gift bundles.",
    "- Occasions: Weddings & bridal favors, corporate & client gifting, housewarmings, and signature scenting for short-let & hospitality apartments across Lagos and Nigeria.",
    `- Consultation: Submit product family and requirements on ${absoluteUrl("/custom-orders")} to open a direct WhatsApp consultation with our Gbagada studio (${STUDIO_PHONE_DISPLAY}).`,
    "",
    "## Frequently Asked Questions",
    ...mergedFaqs.flatMap((faq) => [
      `### ${faq.question}`,
      faq.answer,
      "",
    ]),
    "## Custom Order FAQs",
    ...DEFAULT_CUSTOM_ORDER_FAQS.flatMap((faq) => [
      `### ${faq.question}`,
      faq.answer,
      "",
    ]),
    "## Candle Safety, Diffuser, Spray & Gypsum Care Guide",
    ...safetySections.flatMap((s) => [
      ...(s.heading ? [`### ${s.heading}`] : []),
      s.body,
      "",
    ]),
    "## Returns & Refunds Policy",
    ...returnsSections.flatMap((s) => [
      ...(s.heading ? [`### ${s.heading}`] : []),
      s.body,
      "",
    ]),
  ];

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
