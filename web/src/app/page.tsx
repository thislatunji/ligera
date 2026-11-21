import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { getPublicProductsSafe } from "@/lib/seo/catalog.server";
import { buildItemListJsonLd, safeJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_URL } from "@/lib/seo/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Ligera — Luxury Scented Candles, Reed Diffusers & Gypsum Decor in Lagos",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Ligera — Luxury Scented Candles, Reed Diffusers & Gypsum Decor in Lagos",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
};

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
