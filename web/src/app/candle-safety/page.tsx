import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getContentPageSafe } from "@/lib/seo/catalog.server";
import { DEFAULT_CANDLE_SAFETY_SECTIONS } from "@/lib/seo/content-defaults";
import { buildBreadcrumbJsonLd, safeJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "Candle Safety & Home Fragrance Care Guide",
  description:
    "How to care for scented candles, reed diffusers, room & linen sprays, and sealed gypsum trays and vases from Ligera in Lagos.",
  path: "/candle-safety",
});

export default async function CandleSafetyPage() {
  const cmsPage = await getContentPageSafe("candle-safety");
  const sections =
    cmsPage?.sections && cmsPage.sections.length > 1
      ? cmsPage.sections
      : DEFAULT_CANDLE_SAFETY_SECTIONS;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Candle Safety", path: "/candle-safety" },
  ]);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b-2 border-gold/50 bg-forest text-forest-foreground">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,oklch(0.7_0.075_78_/_0.14),transparent_55%)]"
          />
          <div className="relative mx-auto max-w-4xl px-5 py-14 md:py-20">
            <p className="eyebrow text-gold">Care &amp; Safety</p>
            <h1 className="mt-4 text-4xl leading-[1.08] text-forest-foreground sm:text-5xl">
              Candle safety &amp; care guide
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-forest-foreground/80 sm:text-base">
              Simple rituals to help your Ligera scented candles burn evenly and keep your
              reed diffusers, room sprays, and mineral gypsum vessels at their best.
            </p>
          </div>
        </section>

        <section className="border-b border-clay/50 bg-sand/85">
          <div className="mx-auto max-w-4xl px-5 py-14 md:py-16">
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <article
                  key={`${section.heading}-${idx}`}
                  className={`rounded-sm border border-clay/60 border-l-4 bg-card p-6 shadow-[var(--shadow-soft)] sm:p-7 ${
                    idx % 2 === 0 ? "border-l-gold" : "border-l-forest"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-block rounded-sm px-2.5 py-0.5 text-[10px] tracking-[0.2em] uppercase ${
                        idx % 2 === 0
                          ? "border border-sage/60 bg-sage/25 text-forest"
                          : "bg-forest text-gold"
                      }`}
                    >
                      Ritual {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  {section.heading && (
                    <h2 className="mt-3 text-2xl text-forest">{section.heading}</h2>
                  )}
                  <p className="mt-3 text-sm leading-relaxed text-ink/80 sm:text-base">
                    {section.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-5 py-14 md:py-16">
            <div className="rounded-sm border border-gold/30 bg-forest p-7 text-forest-foreground shadow-[var(--shadow-soft)] sm:p-9">
              <p className="eyebrow text-gold">Shop the rituals</p>
              <h2 className="mt-2 text-2xl text-forest-foreground sm:text-3xl">
                Hand-poured candles &amp; sealed gypsum vessels
              </h2>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/collections/scented-candles" className="btn-gold">
                  Shop scented candles
                </Link>
                <Link href="/collections/gypsum-decor" className="btn-outline-light">
                  Shop gypsum trays &amp; vessels
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
