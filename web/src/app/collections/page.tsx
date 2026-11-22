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
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "Collections — Candles, Diffusers, Sprays & Gypsum",
  description:
    "Shop Ligera's Lagos home fragrance collection: scented candles, reed diffusers, room & linen sprays, and gypsum decor. Lagos & nationwide Nigeria delivery.",
  path: "/collections",
});

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
