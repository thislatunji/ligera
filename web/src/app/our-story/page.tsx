import type { Metadata } from "next";
import { OurStoryClient } from "@/components/OurStoryClient";
import { getContentPageSafe } from "@/lib/seo/catalog.server";
import { buildBreadcrumbJsonLd, safeJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "Our Story — Gbagada, Lagos Home Fragrance Studio",
  description:
    "Meet Ligera, a Gbagada, Lagos home fragrance studio crafting small-batch scented candles, reed diffusers, room & linen sprays, and sculpted gypsum decor.",
  path: "/our-story",
});

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
