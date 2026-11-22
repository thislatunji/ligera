import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin, Phone, Truck } from "lucide-react";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  getContentPageSafe,
  getDeliveryZonesSafe,
} from "@/lib/seo/catalog.server";
import { DEFAULT_RETURNS_SECTIONS } from "@/lib/seo/content-defaults";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  safeJsonLd,
} from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  STUDIO_ADDRESS,
  STUDIO_HOURS_DISPLAY,
  STUDIO_PHONE_DISPLAY,
} from "@/lib/seo/site";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "Lagos Delivery, Nigeria Shipping & Studio Pickup",
  description:
    "View Ligera Lagos delivery zones and timelines, nationwide Nigeria shipping, Gbagada studio pickup hours (Mon–Sat, 9am–6pm WAT), and returns policy.",
  path: "/delivery-returns",
});

export default async function DeliveryReturnsPage() {
  const [zones, cmsReturns] = await Promise.all([
    getDeliveryZonesSafe(),
    getContentPageSafe("returns"),
  ]);

  const returnsSections =
    cmsReturns?.sections && cmsReturns.sections.length > 0
      ? cmsReturns.sections
      : DEFAULT_RETURNS_SECTIONS;

  const deliveryFaqs = [
    {
      question: "How does Lagos delivery work?",
      answer:
        "Orders within Lagos are dispatched by delivery zone (including Ikeja, Surulere, Lekki, Victoria Island, and surrounding neighborhoods) and typically arrive within 2–3 working days.",
    },
    {
      question: "Do you ship outside Lagos to Abuja or other states in Nigeria?",
      answer:
        "Yes. While delivery is prioritized within Lagos, we ship nationwide across Nigeria. Reach out on 0809 661 3114 if you need custom interstate dispatch coordination.",
    },
    {
      question: "Can I pick up my order in Gbagada, Lagos?",
      answer: `Yes. Studio pickup is available at ${STUDIO_ADDRESS.formatted} during opening hours (${STUDIO_HOURS_DISPLAY}).`,
    },
  ];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Delivery & Returns", path: "/delivery-returns" },
  ]);
  const faqJsonLd = buildFaqJsonLd(deliveryFaqs);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />

      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b-2 border-gold/50 bg-forest text-forest-foreground">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,oklch(0.7_0.075_78_/_0.14),transparent_55%)]"
          />
          <div className="relative mx-auto max-w-5xl px-5 py-14 md:py-20">
            <p className="eyebrow text-gold">Shipping, Pickup &amp; Returns</p>
            <h1 className="mt-4 text-4xl leading-[1.08] text-forest-foreground sm:text-5xl">
              Delivery &amp; Gbagada studio pickup
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-forest-foreground/80 sm:text-base">
              Ligera dispatches Lagos-first across our neighborhood delivery zones, ships
              nationwide across Nigeria, and offers in-person order pickup at our Gbagada studio.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-sm border border-forest-foreground/20 bg-forest-foreground/8 px-3 py-1.5 text-xs text-forest-foreground/85">
                <Truck className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                Lagos zones · 2–3 working days
              </span>
              <span className="inline-flex items-center gap-2 rounded-sm border border-forest-foreground/20 bg-forest-foreground/8 px-3 py-1.5 text-xs text-forest-foreground/85">
                <MapPin className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                Nationwide Nigeria shipping
              </span>
              <span className="inline-flex items-center gap-2 rounded-sm border border-forest-foreground/20 bg-forest-foreground/8 px-3 py-1.5 text-xs text-forest-foreground/85">
                <Clock className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                Gbagada pickup · {STUDIO_HOURS_DISPLAY}
              </span>
            </div>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-5xl px-5 py-14 md:py-16">
            <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
              <div className="overflow-hidden rounded-sm border border-clay/60 bg-card shadow-[var(--shadow-soft)]">
                <div className="border-b border-clay/45 bg-sand/80 px-6 py-5 sm:px-8">
                  <p className="eyebrow flex items-center gap-2 text-forest">
                    <Truck className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                    Lagos Delivery Zones
                  </p>
                  <h2 className="mt-2 text-2xl text-forest sm:text-3xl">
                    Standard Lagos delivery zones
                  </h2>
                  <p className="mt-2 text-sm text-ink/75">
                    Delivery zones are selectable directly at checkout. Orders are fulfilled from our
                    Gbagada studio.
                  </p>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="overflow-x-auto rounded-sm border border-clay/45">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-forest text-xs uppercase tracking-wider text-forest-foreground">
                        <tr>
                          <th className="px-4 py-3 font-normal">Zone</th>
                          <th className="px-4 py-3 font-normal text-gold">Estimated Timeline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-clay/35">
                        {zones.map((zone) => (
                          <tr key={zone.id} className="odd:bg-card even:bg-sand/50">
                            <td className="px-4 py-3.5 font-medium text-forest">{zone.name}</td>
                            <td className="px-4 py-3.5 text-ink/75">
                              {zone.etaText || "2–3 working days"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-6 rounded-sm border border-clay/50 border-l-4 border-l-gold bg-sand/70 p-4 text-sm leading-relaxed text-ink/85">
                    <strong className="font-medium text-forest">Nationwide Nigeria delivery:</strong>{" "}
                    Ordering from Abuja, Port Harcourt, Ibadan, or another state? We package fragile
                    glass vessels and mineral gypsum carefully for interstate courier dispatch across
                    Nigeria.
                  </p>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-sm border border-gold/30 bg-forest p-6 text-forest-foreground shadow-[var(--shadow-soft)] sm:p-8">
                  <p className="eyebrow text-gold">Studio Pickup</p>
                  <h2 className="mt-3 text-2xl text-forest-foreground">
                    Pick up in Gbagada, Lagos
                  </h2>
                  <div className="mt-5 space-y-3 text-sm text-forest-foreground/85">
                    <p className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                      <span>{STUDIO_ADDRESS.formatted}</span>
                    </p>
                    <p className="flex items-start gap-2.5">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                      <span>{STUDIO_HOURS_DISPLAY}</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Phone className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                      <a
                        href="tel:08096613114"
                        className="text-gold underline underline-offset-4 hover:text-forest-foreground"
                      >
                        {STUDIO_PHONE_DISPLAY}
                      </a>
                    </p>
                  </div>
                  <Link href="/visit-us" className="btn-gold mt-6 w-full">
                    Directions &amp; studio map
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-t border-clay/55 bg-sand/90">
          <div className="mx-auto max-w-5xl px-5 py-14 md:py-16">
            <div>
              <p className="eyebrow text-forest">Policy</p>
              <h2 className="mt-2 text-3xl text-forest">Returns &amp; Refunds</h2>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {returnsSections.map((section, idx) => (
                <article
                  key={`${section.heading}-${idx}`}
                  className={`rounded-sm border border-clay/60 border-t-4 bg-card p-6 shadow-[var(--shadow-soft)] sm:p-7 ${
                    idx % 2 === 0 ? "border-t-forest" : "border-t-gold"
                  }`}
                >
                  {section.heading && (
                    <h3 className="text-2xl text-forest">{section.heading}</h3>
                  )}
                  <p className="mt-3 text-sm leading-relaxed text-ink/80">{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-clay/50 bg-background">
          <div className="mx-auto max-w-5xl px-5 py-14 md:py-16">
            <p className="eyebrow text-forest">Delivery &amp; Pickup FAQs</p>
            <h2 className="mt-2 text-3xl text-forest">
              Frequently asked delivery questions
            </h2>
            <FaqAccordion items={deliveryFaqs} variant="sand" className="mt-8" />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
