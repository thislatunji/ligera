import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ExternalLink, Instagram, MapPin, Phone } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { buildBreadcrumbJsonLd, safeJsonLd } from "@/lib/seo/jsonld";
import {
  AREA_SERVED,
  DEFAULT_OG_IMAGE,
  STUDIO_ADDRESS,
  STUDIO_HOURS_DISPLAY,
  STUDIO_INSTAGRAM_HANDLE,
  STUDIO_INSTAGRAM_URL,
  STUDIO_MAPS_EMBED_URL,
  STUDIO_MAPS_URL,
  STUDIO_PHONE_DISPLAY,
  absoluteUrl,
} from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Visit Our Studio — 43 Onabola Street, Gbagada, Lagos",
  description:
    "Visit Ligera at 43 Onabola Street, Pedro Road, Gbagada, Lagos for studio pickup, custom candle consultations, reed diffusers, room sprays, and gypsum decor. Open Mon–Sat, 9am–6pm WAT.",
  alternates: {
    canonical: "/visit-us",
  },
  openGraph: {
    title: "Visit Ligera Studio — Gbagada, Lagos",
    description:
      "43 Onabola Street, Pedro Road, Gbagada, Lagos. Open Mon–Sat, 9am–6pm WAT for studio pickup and bespoke fragrance inquiries.",
    url: absoluteUrl("/visit-us"),
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
};

export default function VisitUsPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Visit Us", path: "/visit-us" },
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
          <div className="relative mx-auto max-w-5xl px-5 py-14 md:py-20">
            <p className="eyebrow text-gold">Lagos Home Fragrance Studio</p>
            <h1 className="mt-4 text-4xl leading-[1.08] text-forest-foreground sm:text-5xl">
              Visit Ligera in Gbagada, Lagos
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-forest-foreground/80 sm:text-base">
              Every candle, reed diffuser, room spray, and mineral gypsum vessel is crafted at our
              studio on Onabola Street off Pedro Road, Gbagada. Stop by for order pickup or call
              ahead for bespoke gifting consultations.
            </p>
          </div>
        </section>

        <section className="bg-sand/85">
          <div className="mx-auto max-w-5xl px-5 py-14 md:py-16">
            <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
              <div className="overflow-hidden rounded-sm border border-clay/60 bg-card shadow-[var(--shadow-soft)]">
                <div className="bg-forest px-6 py-5 text-forest-foreground sm:px-8">
                  <p className="eyebrow text-gold">Gbagada, Lagos</p>
                  <h2 className="mt-1.5 text-2xl text-forest-foreground">Studio details</h2>
                </div>

                <div className="space-y-5 p-6 sm:p-8">
                  <div className="space-y-4 text-sm text-ink/85">
                    <p className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-forest">
                        <MapPin className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span className="pt-1">{STUDIO_ADDRESS.formatted}</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-forest">
                        <Clock className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span className="pt-1">{STUDIO_HOURS_DISPLAY} · Studio pickup available</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-forest">
                        <Phone className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span>
                        <a
                          href="tel:08096613114"
                          className="font-medium text-forest underline underline-offset-4 hover:text-gold"
                        >
                          {STUDIO_PHONE_DISPLAY}
                        </a>{" "}
                        <span className="text-ink/70">(Call or WhatsApp)</span>
                      </span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-forest">
                        <Instagram className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <a
                        href={STUDIO_INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-forest underline underline-offset-4 hover:text-gold"
                      >
                        {STUDIO_INSTAGRAM_HANDLE}
                      </a>
                    </p>
                  </div>

                  <div className="rounded-sm border border-sage/60 bg-sage/20 p-4">
                    <p className="eyebrow text-forest">Areas We Deliver To</p>
                    <p className="mt-2 text-sm leading-relaxed text-ink/80">
                      Lagos-first dispatch across {AREA_SERVED.slice(0, 6).join(", ")} and
                      surrounding areas, plus nationwide shipping across Nigeria.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <a
                      href={STUDIO_MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold"
                    >
                      Open in Google Maps
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </a>
                    <Link href="/custom-orders" className="btn-forest">
                      Custom orders
                    </Link>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-sm border border-clay/60 bg-card shadow-[var(--shadow-soft)]">
                <iframe
                  id="ligera-studio-google-map"
                  name="ligera-studio-google-map"
                  title={`Ligera Studio — ${STUDIO_ADDRESS.formatted}`}
                  src={STUDIO_MAPS_EMBED_URL}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  className="h-[360px] w-full border-0 md:h-full md:min-h-[420px]"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
