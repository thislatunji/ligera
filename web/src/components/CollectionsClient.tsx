"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { SiteImageEditBar } from "@/components/EditableImageSlot";
import { signatureProducts, type Product } from "@/lib/products";
import { productsQuery } from "@/lib/products-query";
import {
  SEO_CATEGORIES,
  findSeoCategory,
  type SeoCategorySlug,
} from "@/lib/seo/categories";

type CollectionsClientProps = {
  initialProducts?: Product[];
  activeCategorySlug?: string | null;
  eyebrow?: string;
  headline?: string;
  intro?: string;
  customOrderValue?: string;
};

type DynamicCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export function CollectionsClient({
  initialProducts = signatureProducts,
  activeCategorySlug = null,
  eyebrow = "The collection",
  headline = "Browse collections",
  intro = "Four families, one intention — to illuminate every space with warmth you can feel before you see it.",
  customOrderValue,
}: CollectionsClientProps) {
  const { data: products = initialProducts } = useQuery({
    ...productsQuery,
    initialData: initialProducts,
  });

  const { data: apiCategories = [] } = useQuery<DynamicCategory[]>({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories?type=category");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const coreSlugs = new Set<string>(SEO_CATEGORIES.map((c) => c.slug));
  const extraCategories = apiCategories.filter((c) => !coreSlugs.has(c.slug));

  const activeCategory = activeCategorySlug
    ? SEO_CATEGORIES.find((c) => c.slug === activeCategorySlug)
    : undefined;
  const activeExtraCategory =
    activeCategorySlug && !activeCategory
      ? extraCategories.find((c) => c.slug === activeCategorySlug)
      : undefined;

  const shown = activeCategorySlug
    ? products.filter(
        (p) =>
          p.categorySlug === activeCategorySlug ||
          findSeoCategory(p.category)?.slug === activeCategorySlug,
      )
    : products;

  const customHref = customOrderValue
    ? `/custom-orders?product=${encodeURIComponent(customOrderValue)}`
    : "/custom-orders";

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="border-b border-clay/50 bg-sand/85">
          <div className="mx-auto max-w-6xl px-5 pt-14 pb-8 md:pt-16 md:pb-10">
            {(activeCategory || activeExtraCategory || activeCategorySlug) && (
              <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-ink/70">
                <Link href="/" className="hover:text-forest">
                  Home
                </Link>
                <span aria-hidden="true">/</span>
                <Link href="/collections" className="hover:text-forest">
                  Collections
                </Link>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-forest">
                  {activeCategory?.shortTitle ?? activeExtraCategory?.name ?? headline}
                </span>
              </nav>
            )}

            <p className="eyebrow text-forest">{eyebrow}</p>
            <h1 className="mt-4 text-4xl text-forest sm:text-5xl md:text-6xl">{headline}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/80 sm:text-base">
              {intro}
            </p>

            <nav aria-label="Product categories" className="mt-8 flex flex-wrap gap-2 md:mt-10">
              <Link
                href="/collections"
                className={
                  !activeCategorySlug
                    ? "rounded-sm border border-forest bg-forest px-4 py-2 text-[11px] tracking-[0.18em] text-forest-foreground uppercase"
                    : "rounded-sm border border-clay/70 bg-card px-4 py-2 text-[11px] tracking-[0.18em] text-ink/80 uppercase transition-colors hover:border-forest hover:text-forest"
                }
              >
                All
              </Link>
              {SEO_CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/collections/${c.slug}`}
                  className={
                    activeCategorySlug === c.slug
                      ? "rounded-sm border border-forest bg-forest px-4 py-2 text-[11px] tracking-[0.18em] text-forest-foreground uppercase"
                      : "rounded-sm border border-clay/70 bg-card px-4 py-2 text-[11px] tracking-[0.18em] text-ink/80 uppercase transition-colors hover:border-forest hover:text-forest"
                  }
                >
                  {c.shortTitle}
                </Link>
              ))}
              {extraCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/collections/${c.slug}`}
                  className={
                    activeCategorySlug === c.slug
                      ? "rounded-sm border border-forest bg-forest px-4 py-2 text-[11px] tracking-[0.18em] text-forest-foreground uppercase"
                      : "rounded-sm border border-clay/70 bg-card px-4 py-2 text-[11px] tracking-[0.18em] text-ink/80 uppercase transition-colors hover:border-forest hover:text-forest"
                  }
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pt-12 pb-16 md:pt-14 md:pb-20">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-10">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {shown.length === 0 && (
            <p className="text-sm text-ink/75">Nothing in this family just yet.</p>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-24">
          <div className="rounded-sm border border-gold/30 bg-forest p-7 text-forest-foreground shadow-[var(--shadow-soft)] md:flex md:items-center md:justify-between md:gap-8 md:p-10">
            <div className="max-w-xl">
              <p className="eyebrow text-gold">Lagos Studio · Nationwide Delivery</p>
              <h2 className="mt-2 text-2xl text-forest-foreground md:text-3xl">
                Looking for custom scents, event favors, or bulk gifting?
              </h2>
              <p className="mt-2 text-sm text-forest-foreground/80">
                Order directly online for Lagos dispatch, Gbagada studio pickup (Mon–Sat, 9am–6pm
                WAT), or nationwide delivery across Nigeria—or request a tailored bespoke batch.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 md:mt-0 md:shrink-0">
              <Link href={customHref} className="btn-gold">
                Request custom order
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
              <Link href="/delivery-returns" className="btn-outline-light">
                Delivery &amp; pickup
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <SiteImageEditBar />
    </div>
  );
}
