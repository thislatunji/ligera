import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { getPublicProductsSafe } from "@/lib/seo/catalog.server";
import { buildItemListJsonLd, safeJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

export const revalidate = 300;

export const metadata = buildPageMetadata({
  title: "Ligera — Scented Candles, Reed Diffusers & Gypsum Decor",
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default async function Home() {
  const products = await getPublicProductsSafe();
  const itemListJsonLd = buildItemListJsonLd(
    "Ligera Signature Home Fragrance Collection",
    "/",
    products.slice(0, 8),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />
      <HomeClient initialProducts={products} />
    </>
  );
}
