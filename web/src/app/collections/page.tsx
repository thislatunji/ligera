import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { CollectionsClient } from "@/components/CollectionsClient";
import { getPublicProductsSafe } from "@/lib/seo/catalog.server";
import { findSeoCategory } from "@/lib/seo/categories";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  safeJsonLd,
} from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Collections — Scented Candles, Reed Diffusers, Room Sprays & Gypsum Decor",
  description:
    "Browse Ligera's complete home fragrance collection handcrafted in Gbagada, Lagos: scented candles, reed diffusers, room & linen sprays, and sculpted gypsum decor. Lagos delivery, studio pickup & nationwide Nigeria shipping.",
  alternates: {
    canonical: "/collections",
  },
  openGraph: {
    title: "Collections — Scented Candles, Reed Diffusers & Gypsum Decor | Ligera",
    description:
      "Shop hand-poured scented candles, reed diffusers, room sprays, and gypsum decor made in Lagos with nationwide Nigeria delivery.",
    url: absoluteUrl("/collections"),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
};

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const resolved = await searchParams;
  if (resolved?.category) {
    const match = findSeoCategory(resolved.category);
    if (match) {
      permanentRedirect(`/collections/${match.slug}`);
    }
  }

  const products = await getPublicProductsSafe();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
  ]);
  const itemListJsonLd = buildItemListJsonLd(
    "Ligera Collections",
    "/collections",
    products,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />
      <CollectionsClient initialProducts={products} />
    </>
  );
}
