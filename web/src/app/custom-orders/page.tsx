import type { Metadata } from "next";
import Link from "next/link";
import { CustomOrderForm } from "@/components/CustomOrderForm";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_CUSTOM_ORDER_FAQS } from "@/lib/seo/content-defaults";
import {
  buildBespokeServiceJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  safeJsonLd,
} from "@/lib/seo/jsonld";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Custom Scented Candles, Wedding Favors & Corporate Gifts in Lagos",
  description:
    "Order bespoke scented candles, custom reed diffusers, room sprays, gypsum trays, wedding souvenirs, corporate gifts, and short-let scenting crafted in Gbagada, Lagos for delivery across Nigeria.",
  alternates: {
    canonical: "/custom-orders",
  },
  openGraph: {
    title: "Custom Scented Candles, Wedding Favors & Corporate Gifts | Ligera",
    description:
      "Bespoke candles, reed diffusers, room sprays, and sculpted gypsum pieces crafted in Gbagada, Lagos for weddings, corporate gifting, and hospitality.",
    url: absoluteUrl("/custom-orders"),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
};

const bespokeUseCases = [
  {
    title: "Wedding Favors & Souvenirs",
    description:
      "Custom-labeled scented candles, mini reed diffusers, and sealed gypsum keepsake trays tailored to your wedding palette and delivered across Lagos and Nigeria.",
    href: "/custom-orders?product=Candles",
  },
  {
    title: "Corporate & Branded Gifting",
    description:
      "Curated home fragrance gift sets with custom messaging and cohesive vessel finishes for client appreciation, launches, and end-of-year hampers.",
    href: "/custom-orders?product=Curated%20Bundle",
  },
  {
    title: "Short-Let, Airbnb & Hospitality",
    description:
      "Consistent signature reed diffusers, linen sprays, and durable gypsum trays formulated for residences in Victoria Island, Lekki, Ikoyi, and mainland Lagos.",
    href: "/custom-orders?product=Diffusers",
  },
];

export default function CustomOrdersPage() {
  const serviceJsonLd = buildBespokeServiceJsonLd();
  const faqJsonLd = buildFaqJsonLd(DEFAULT_CUSTOM_ORDER_FAQS);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Custom Orders", path: "/custom-orders" },
  ]);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceJsonLd) }}
      />
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
          <div className="relative mx-auto max-w-5xl px-5 py-14 md:py-20">
            <p className="eyebrow text-gold">Bespoke &amp; Custom Orders</p>
            <h1 className="mt-4 max-w-2xl text-4xl leading-[1.06] text-forest-foreground sm:text-5xl md:text-6xl">
              Crafted for <em className="not-italic text-gold">your</em> space
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-forest-foreground/80 sm:text-base">
              Select the product family you want to customize, share your scent notes,
              vessel finishes, or occasion details below, and send your request directly to
              our studio on WhatsApp.
            </p>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-5xl px-5 py-14 md:py-16">
            <CustomOrderForm />
          </div>
        </section>

        <section className="border-y border-clay/55 bg-sand/90">
          <div className="mx-auto max-w-5xl px-5 py-16 md:py-20">
            <p className="eyebrow text-forest">What We Craft To Order</p>
            <h2 className="mt-3 text-3xl text-forest md:text-4xl">
              Weddings, corporate gifting &amp; hospitality scenting
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {bespokeUseCases.map((useCase, idx) => {
                const accentBorder =
                  idx === 0
                    ? "border-t-forest"
                    : idx === 1
                      ? "border-t-gold"
                      : "border-t-sage";

                return (
                  <article
                    key={useCase.title}
                    className={`flex flex-col justify-between rounded-sm border border-clay/60 border-t-4 bg-card p-6 shadow-[var(--shadow-soft)] ${accentBorder}`}
                  >
                    <div>
                      <h3 className="text-2xl text-forest">{useCase.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-ink/80">
                        {useCase.description}
                      </p>
                    </div>
                    <Link
                      href={useCase.href}
                      className="mt-5 text-[11px] font-medium tracking-[0.18em] text-forest uppercase transition-colors hover:text-gold"
                    >
                      Pre-fill inquiry →
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-5xl px-5 py-16 md:py-20">
            <p className="eyebrow text-forest">Custom Order Questions</p>
            <h2 className="mt-3 text-3xl text-forest md:text-4xl">Frequently asked questions</h2>
            <FaqAccordion
              items={DEFAULT_CUSTOM_ORDER_FAQS}
              variant="sand"
              className="mt-8"
            />
            <p className="mt-8 text-sm text-ink/80">
              Need delivery zone rates or studio pickup hours? See{" "}
              <Link
                href="/delivery-returns"
                className="font-medium text-forest underline underline-offset-4 hover:text-gold"
              >
                Delivery &amp; Returns
              </Link>{" "}
              or{" "}
              <Link
                href="/faqs"
                className="font-medium text-forest underline underline-offset-4 hover:text-gold"
              >
                all FAQs
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
