import type { Metadata } from "next";
import { OurStoryClient } from "@/components/OurStoryClient";
import { getContentPageSafe } from "@/lib/seo/catalog.server";
import { buildBreadcrumbJsonLd, safeJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Our Story — Gbagada, Lagos Home Fragrance Studio",
  description:
    "Meet Ligera, a Lagos home fragrance studio on Onabola Street, Gbagada crafting small-batch scented candles, reed diffusers, room & linen sprays, and sculpted gypsum decor.",
  alternates: {
    canonical: "/our-story",
  },
  openGraph: {
    title: "Our Story — Gbagada, Lagos Home Fragrance Studio | Ligera",
    description:
      "Inside Ligera's Gbagada, Lagos studio: hand-poured candles, reed diffusers, room sprays, and mineral gypsum decor.",
    url: absoluteUrl("/our-story"),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
};

export default async function OurStoryPage() {
  const cmsContent = await getContentPageSafe("our-story");
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Our Story", path: "/our-story" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <OurStoryClient initialCmsContent={cmsContent} />
    </>
  );
}
