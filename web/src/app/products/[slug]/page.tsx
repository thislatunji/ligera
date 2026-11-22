import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Truck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { naira, signatureProducts } from "@/lib/products";
import {
  getProductDetailSafe,
  getPublicProductsSafe,
} from "@/lib/seo/catalog.server";
import { findSeoCategory } from "@/lib/seo/categories";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  safeJsonLd,
} from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  DEFAULT_OG_IMAGE,
  STUDIO_ADDRESS,
  STUDIO_HOURS_DISPLAY,
  STUDIO_PHONE_DISPLAY,
} from "@/lib/seo/site";

export const revalidate = 300;

export function generateStaticParams() {
  return signatureProducts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetailSafe(slug);
  if (!product) {
    return {};
  }

  const title =
    product.seo?.title?.trim() || `${product.name} — ${product.category} in Lagos`;
  const rawDescription =
    product.seo?.metaDescription?.trim() ||
    `Buy ${product.name} (${product.category}) from Ligera in Lagos for ${naira(product.priceFrom)}. Handcrafted in Gbagada with Lagos delivery, studio pickup & Nigeria shipping.`;
  const description =
    rawDescription.length > 160
      ? `${rawDescription.slice(0, 157).trimEnd()}...`
      : rawDescription;
  const ogImageUrl = product.seo?.ogImage?.trim() || product.imageUrl;
  const primaryImg = product.images?.[0];

  return buildPageMetadata({
    title,
    description,
    path: `/products/${product.slug}`,
    image:
      ogImageUrl && ogImageUrl !== DEFAULT_OG_IMAGE
        ? {
            url: ogImageUrl,
            ...(ogImageUrl === primaryImg?.url && primaryImg.width
              ? { width: primaryImg.width }
              : {}),
            ...(ogImageUrl === primaryImg?.url && primaryImg.height
              ? { height: primaryImg.height }
              : {}),
            alt: product.imageAlt || `${product.name} — ${product.category}`,
          }
        : undefined,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductDetailSafe(slug);
  if (!product) {
    notFound();
  }

  const allProducts = await getPublicProductsSafe();
  const seoCat = findSeoCategory(product.category);
  const categoryPath = seoCat ? `/collections/${seoCat.slug}` : "/collections";
  const categoryTitle = seoCat?.shortTitle ?? product.category;

  const hasScentNotes =
    product.scentNotes.top.length > 0 ||
    product.scentNotes.heart.length > 0 ||
    product.scentNotes.base.length > 0;

  const pairedProducts = (product.pairsWith ?? [])
    .map((pair) =>
      allProducts.find((p) => p.slug === pair.slug || p.id === pair.id),
    )
    .filter(
      (p): p is NonNullable<typeof p> => Boolean(p && p.slug !== product.slug),
    );

  const seenRelatedSlugs = new Set(pairedProducts.map((p) => p.slug));
  const categoryFallback = allProducts
    .filter((p) => p.slug !== product.slug && !seenRelatedSlugs.has(p.slug))
    .sort((a, b) => {
      const aSame = findSeoCategory(a.category)?.slug === seoCat?.slug ? 0 : 1;
      const bSame = findSeoCategory(b.category)?.slug === seoCat?.slug ? 0 : 1;
      return aSame - bSame;
    });

  const related = [...pairedProducts, ...categoryFallback].slice(0, 4);

  const additionalProperty = [
    ...(product.scentNotes.top.length > 0
      ? [{ name: "Top Scent Notes", value: product.scentNotes.top.join(", ") }]
      : []),
    ...(product.scentNotes.heart.length > 0
      ? [{ name: "Heart Scent Notes", value: product.scentNotes.heart.join(", ") }]
      : []),
    ...(product.scentNotes.base.length > 0
      ? [{ name: "Base Scent Notes", value: product.scentNotes.base.join(", ") }]
      : []),
    ...(product.finish?.trim()
      ? [{ name: "Finish / Format", value: product.finish.trim() }]
      : []),
    ...(product.burnTime?.trim()
      ? [{ name: "Burn Time", value: product.burnTime.trim() }]
      : []),
    ...(product.dimensions?.trim()
      ? [{ name: "Dimensions", value: product.dimensions.trim() }]
      : []),
    ...(product.ingredients?.trim()
      ? [{ name: "Materials / Ingredients", value: product.ingredients.trim() }]
      : []),
  ];

  const productJsonLd = buildProductJsonLd({
    name: product.name,
    slug: product.slug,
    description:
      product.description || `${product.name} — ${product.category} by Ligera`,
    category: product.category,
    price: product.priceFrom,
    imageUrl: product.imageUrl,
    images: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku,
    inStock: product.badge !== "sold_out",
    madeToOrder: product.madeToOrder,
    variants: product.variants,
    additionalProperty,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
    { name: categoryTitle, path: categoryPath },
    { name: product.name, path: `/products/${product.slug}` },
  ]);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <SiteHeader />

      <main>
        <section className="mx-auto max-w-6xl px-5 pt-10 pb-14 md:pt-14 md:pb-20">
          <nav
            aria-label="Breadcrumb"
            className="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/collections" className="hover:text-foreground">
              Collections
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={categoryPath} className="hover:text-foreground">
              {categoryTitle}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          <ProductDetailClient product={product} />

          {/* Structured factual specs & delivery info for customers and answer engines */}
          <div className="mt-14 grid gap-6 border-t border-clay/50 pt-10 md:grid-cols-3">
            {hasScentNotes && (
              <div className="rounded-sm border border-clay/60 border-t-4 border-t-gold bg-card p-6 shadow-[var(--shadow-soft)]">
                <p className="eyebrow text-forest">Fragrance Notes</p>
                <dl className="mt-4 space-y-2.5 text-sm">
                  {product.scentNotes.top.length > 0 && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                        Top
                      </dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {product.scentNotes.top.join(", ")}
                      </dd>
                    </div>
                  )}
                  {product.scentNotes.heart.length > 0 && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                        Heart
                      </dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {product.scentNotes.heart.join(", ")}
                      </dd>
                    </div>
                  )}
                  {product.scentNotes.base.length > 0 && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wider">
                        Base
                      </dt>
                      <dd className="mt-0.5 font-medium text-ink">
                        {product.scentNotes.base.join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            <div className="rounded-sm border border-sage/65 border-t-4 border-t-forest bg-sage/20 p-6">
              <p className="eyebrow flex items-center gap-2 text-forest">
                <ShieldCheck className="h-3.5 w-3.5 text-forest" strokeWidth={1.5} />
                Craft &amp; Care
              </p>
              <dl className="mt-4 space-y-2.5 text-sm text-ink/80">
                {product.finish && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-forest/75">
                      Finish / Format
                    </dt>
                    <dd className="mt-0.5 font-medium text-ink">{product.finish}</dd>
                  </div>
                )}
                {product.burnTime && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-forest/75">Burn Time</dt>
                    <dd className="mt-0.5 font-medium text-ink">{product.burnTime}</dd>
                  </div>
                )}
                {product.dimensions && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-forest/75">Dimensions</dt>
                    <dd className="mt-0.5 font-medium text-ink">{product.dimensions}</dd>
                  </div>
                )}
                {product.ingredients && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-forest/75">Materials</dt>
                    <dd className="mt-0.5 font-medium text-ink">{product.ingredients}</dd>
                  </div>
                )}
                {product.safetyInfo && <p className="pt-1 leading-relaxed">{product.safetyInfo}</p>}
                <p className="pt-1">
                  <Link
                    href="/candle-safety"
                    className="text-xs font-medium text-forest underline underline-offset-4 hover:text-gold"
                  >
                    Read full care &amp; candle safety guide
                  </Link>
                </p>
              </dl>
            </div>

            <div className="rounded-sm border border-gold/30 bg-forest p-6 text-forest-foreground shadow-[var(--shadow-soft)]">
              <p className="eyebrow flex items-center gap-2 text-gold">
                <Truck className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                Delivery &amp; Studio Pickup
              </p>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-forest-foreground/80">
                <p>
                  <strong className="font-medium text-forest-foreground">Lagos delivery:</strong>{" "}
                  Zone-based dispatch across Lagos (Ikeja, Surulere, Lekki, Victoria Island &amp;
                  more) in 2–3 working days. Nationwide shipping across Nigeria is also available.
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                  <span>
                    <strong className="font-medium text-forest-foreground">Gbagada pickup:</strong>{" "}
                    {STUDIO_ADDRESS.formatted} ({STUDIO_HOURS_DISPLAY}). Call/WhatsApp{" "}
                    {STUDIO_PHONE_DISPLAY}.
                  </span>
                </p>
                <p>
                  <Link
                    href="/delivery-returns"
                    className="text-xs text-gold underline underline-offset-4 hover:text-forest-foreground"
                  >
                    View delivery zones, timelines &amp; returns
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="border-t border-clay/50 bg-sand/85">
            <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-forest">Explore more</p>
                  <h2 className="mt-2 text-3xl text-forest md:text-4xl">Pairs well with</h2>
                </div>
                <Link href={categoryPath} className="eyebrow text-forest hover:text-gold">
                  View {categoryTitle} →
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-10">
                {related.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
