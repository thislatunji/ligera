import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CollectionsClient } from "@/components/CollectionsClient";
import { getDynamicCategoryBySlugSafe, getPublicProductsSafe } from "@/lib/seo/catalog.server";
import { SEO_CATEGORIES, findSeoCategory } from "@/lib/seo/categories";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  safeJsonLd,
} from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

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
  if (seoCat) {
    return buildPageMetadata({
      title: seoCat.seoTitle,
      description: seoCat.seoDescription,
      path: `/collections/${seoCat.slug}`,
    });
  }

  const dynCat = await getDynamicCategoryBySlugSafe(category);
  if (!dynCat) {
    return {};
  }

  return buildPageMetadata({
    title: `${dynCat.name} in Lagos`,
    description:
      dynCat.description ||
      `Shop ${dynCat.name} handcrafted in Lagos by Ligera. Small-batch home fragrance and decor with Lagos and nationwide Nigeria delivery.`,
    path: `/collections/${dynCat.slug}`,
  });
}

export default async function CategoryCollectionPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const seoCat = findSeoCategory(category);
  if (seoCat && category !== seoCat.slug) {
    permanentRedirect(`/collections/${seoCat.slug}`);
  }
  const dynCat = seoCat ? null : await getDynamicCategoryBySlugSafe(category);
  if (!seoCat && !dynCat) {
    notFound();
  }

  const activeSlug = seoCat?.slug ?? dynCat!.slug;
  const activeTitle = seoCat?.shortTitle ?? dynCat!.name;
  const activeHeadline = seoCat?.headline ?? dynCat!.name;
  const activeIntro =
    seoCat?.intro ??
    (dynCat!.description ||
      "Handcrafted in small batches at our Gbagada, Lagos studio with Lagos dispatch, studio pickup, and nationwide delivery.");

  const allProducts = await getPublicProductsSafe();
  const categoryProducts = allProducts.filter(
    (p) => p.categorySlug === activeSlug || findSeoCategory(p.category)?.slug === activeSlug,
  );

  const path = `/collections/${activeSlug}`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: activeTitle, path },
  ]);
  const itemListJsonLd = buildItemListJsonLd(
    activeHeadline,
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
        activeCategorySlug={activeSlug}
        eyebrow="The collection"
        headline={activeHeadline}
        intro={activeIntro}
        customOrderValue={seoCat?.customOrderValue}
      />
    </>
  );
}
