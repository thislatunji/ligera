import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin, Truck } from "lucide-react";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getContentPageSafe } from "@/lib/seo/catalog.server";
import { DEFAULT_FAQS, type FaqEntry } from "@/lib/seo/content-defaults";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  safeJsonLd,
} from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE, STUDIO_HOURS_DISPLAY, absoluteUrl } from "@/lib/seo/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Frequently Asked Questions — Candles, Delivery & Studio Pickup",
  description:
    "Answers about Ligera scented candles, reed diffusers, room sprays, gypsum decor, Lagos & nationwide Nigeria delivery, Gbagada studio pickup, and custom orders.",
  alternates: {
    canonical: "/faqs",
  },
  openGraph: {
    title: "FAQs — Ligera Home Fragrance Studio Lagos",
    description:
      "Answers about Lagos delivery, nationwide Nigeria shipping, Gbagada pickup (Mon–Sat, 9am–6pm), candle care, and custom orders.",
    url: absoluteUrl("/faqs"),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
};

export default async function FaqsPage() {
  const cmsPage = await getContentPageSafe("faqs");
  const cmsFaqs: FaqEntry[] =
    cmsPage?.sections
      ?.filter((s) => s.heading?.trim() && s.body?.trim())
      .map((s) => ({ question: s.heading.trim(), answer: s.body.trim() })) ?? [];

  const mergedFaqs =
    cmsFaqs.length >= DEFAULT_FAQS.length
      ? cmsFaqs
      : [
          ...DEFAULT_FAQS,
          ...cmsFaqs.filter(
            (c) =>
              !DEFAULT_FAQS.some(
                (d) => d.question.toLowerCase() === c.question.toLowerCase(),
              ),
          ),
        ];

  const faqJsonLd = buildFaqJsonLd(mergedFaqs);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "FAQs", path: "/faqs" },
  ]);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
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
            <p className="eyebrow text-gold">Support &amp; Answers</p>
            <h1 className="mt-4 text-4xl leading-[1.08] text-forest-foreground sm:text-5xl">
              Frequently asked questions
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-forest-foreground/80 sm:text-base">
              Everything you need to know about ordering scented candles, reed diffusers, room
              sprays, and gypsum decor from Ligera in Gbagada, Lagos.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-sm border border-forest-foreground/20 bg-forest-foreground/8 px-3 py-1.5 text-xs text-forest-foreground/85">
                <Clock className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                Gbagada pickup · {STUDIO_HOURS_DISPLAY}
              </span>
              <span className="inline-flex items-center gap-2 rounded-sm border border-forest-foreground/20 bg-forest-foreground/8 px-3 py-1.5 text-xs text-forest-foreground/85">
                <Truck className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                Lagos · 2–3 working days
              </span>
              <span className="inline-flex items-center gap-2 rounded-sm border border-forest-foreground/20 bg-forest-foreground/8 px-3 py-1.5 text-xs text-forest-foreground/85">
                <MapPin className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                Nationwide Nigeria shipping
              </span>
            </div>
          </div>
        </section>

        <section className="border-b border-clay/50 bg-sand/85">
          <div className="mx-auto max-w-4xl px-5 py-14 md:py-16">
            <h2 className="sr-only">Questions and answers</h2>
            <FaqAccordion items={mergedFaqs} />
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-5 py-14 md:py-16">
            <div className="rounded-sm border border-gold/30 bg-forest p-7 text-forest-foreground shadow-[var(--shadow-soft)] sm:p-9">
              <p className="eyebrow text-gold">Need more details?</p>
              <h2 className="mt-2 text-2xl text-forest-foreground sm:text-3xl">
                Explore collections or speak with our Gbagada studio
              </h2>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/collections" className="btn-gold">
                  Browse collections
                </Link>
                <Link href="/delivery-returns" className="btn-outline-light">
                  Delivery &amp; pickup details
                </Link>
                <Link href="/custom-orders" className="btn-outline-light">
                  Request custom order
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
