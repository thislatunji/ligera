import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionsClient } from "@/components/CollectionsClient";
import { getPublicProductsSafe } from "@/lib/seo/catalog.server";
import { SEO_CATEGORIES, findSeoCategory } from "@/lib/seo/categories";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  safeJsonLd,
} from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/site";

export const revalidate = 300;

export function generateStaticParams() {
  return SEO_CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const seoCat = findSeoCategory(category);
  if (!seoCat) {
    return {};
  }

  return {
    title: seoCat.seoTitle,
    description: seoCat.seoDescription,
    alternates: {
      canonical: `/collections/${seoCat.slug}`,
    },
    openGraph: {
      title: `${seoCat.seoTitle} | Ligera`,
      description: seoCat.seoDescription,
      url: absoluteUrl(`/collections/${seoCat.slug}`),
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${seoCat.seoTitle} | Ligera`,
      description: seoCat.seoDescription,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function CategoryCollectionPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const seoCat = findSeoCategory(category);
  if (!seoCat) {
    notFound();
  }

  const allProducts = await getPublicProductsSafe();
  const categoryProducts = allProducts.filter(
    (p) => findSeoCategory(p.category)?.slug === seoCat.slug,
  );

  const path = `/collections/${seoCat.slug}`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: seoCat.shortTitle, path },
  ]);
  const itemListJsonLd = buildItemListJsonLd(
    seoCat.headline,
    path,
    categoryProducts,
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
      <CollectionsClient
        initialProducts={allProducts}
        activeCategorySlug={seoCat.slug}
        eyebrow="The collection"
        headline={seoCat.headline}
        intro={seoCat.intro}
        customOrderValue={seoCat.customOrderValue}
      />
    </>
  );
}
