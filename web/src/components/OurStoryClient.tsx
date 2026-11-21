"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, ExternalLink, Flame, Leaf, MapPin, Sparkles, Wind } from "lucide-react";
import logo from "@/assets/ligera-logo-green.png";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { EditableImageTrigger, SiteImageEditBar } from "@/components/EditableImageSlot";
import { assetSrc } from "@/lib/products";
import {
  STUDIO_ADDRESS,
  STUDIO_HOURS_DISPLAY,
  STUDIO_MAPS_EMBED_URL,
  STUDIO_MAPS_URL,
  STUDIO_PHONE_DISPLAY,
} from "@/lib/seo/site";
import { isVideoMediaUrl, useSiteImages, type SiteImageKey } from "@/lib/site-images";

type ContentSection = {
  heading?: string;
  body?: string;
  image?: { url?: string; alt?: string };
};

export type ContentPageResponse = {
  title?: string;
  sections?: ContentSection[];
};

async function fetchOurStoryContent(): Promise<ContentPageResponse | null> {
  try {
    const res = await fetch("/api/content/our-story");
    if (!res.ok) return null;
    return (await res.json()) as ContentPageResponse;
  } catch {
    return null;
  }
}

const craftPillars: {
  icon: typeof Flame;
  title: string;
  body: string;
  href: string;
  imageKey: SiteImageKey;
  alt: string;
}[] = [
  {
    icon: Flame,
    title: "Scented Candles",
    body: "Clean-burning wax hand-poured in small batches, paired with hand-trimmed cotton wicks and cured slowly for an even, lingering throw.",
    href: "/collections/scented-candles",
    imageKey: "storyCraftCandles",
    alt: "Hand-poured Ligera scented candle and wax melts",
  },
  {
    icon: Leaf,
    title: "Reed Diffusers",
    body: "Steady, effortless fragrance oils paired with natural reeds — layered top, heart, and base notes composed to soften a room, never loud or sharp.",
    href: "/collections/reed-diffusers",
    imageKey: "storyCraftDiffusers",
    alt: "Ligera reed diffuser bottle",
  },
  {
    icon: Wind,
    title: "Room and Linen Spray",
    body: "Fine, lingering mists crafted for bedrooms, living spaces, and freshly laundered linens — an instant soft veil of scent whenever a room needs a reset.",
    href: "/collections/room-linen-sprays",
    imageKey: "storyCraftSprays",
    alt: "Ligera room and linen spray bottle",
  },
  {
    icon: Sparkles,
    title: "Gypsum Decor",
    body: "Trinket trays, ribbed vessels, and curve vases cast, hand-sanded smooth, and sealed against water and wax so each piece stays on your shelf for years.",
    href: "/collections/gypsum-decor",
    imageKey: "storyCraftGypsum",
    alt: "Handcrafted Ligera gypsum decor tray and vase",
  },
];

const values = [
  {
    title: "Quiet luxury",
    body: "We believe a home should exhale the moment you step inside. Our fragrances sit gently in the background, turning daily rituals into unhurried moments.",
  },
  {
    title: "Considered materials",
    body: "From clean waxes and skin-safe fine fragrance oils to hand-sealed mineral gypsum, every material is chosen for warmth, longevity, and care.",
  },
  {
    title: "Made in Lagos",
    body: "Every candle, diffuser, spray, and vessel is composed, finished, and inspected in our Gbagada studio before earning the Ligera mark.",
  },
];

export function OurStoryClient({
  initialCmsContent = null,
}: {
  initialCmsContent?: ContentPageResponse | null;
}) {
  const { images } = useSiteImages();
  const { data: cmsContent } = useQuery({
    queryKey: ["content", "our-story"],
    queryFn: fetchOurStoryContent,
    initialData: initialCmsContent ?? undefined,
  });

  const customSections = cmsContent?.sections?.filter(
    (s) => s.heading?.trim() || s.body?.trim(),
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero / Intro */}
        <section className="relative overflow-hidden border-b-2 border-gold/50 bg-forest text-forest-foreground">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,oklch(0.7_0.075_78_/_0.14),transparent_55%)]"
          />
          <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-14 md:pt-24 md:pb-20">
            <p className="eyebrow text-gold">Our Story</p>
            <h1 className="mt-4 max-w-3xl text-5xl leading-[1.06] text-forest-foreground sm:text-6xl">
              Scent is the <em className="not-italic text-gold">softest</em> kind of luxury.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-forest-foreground/80">
              Ligera is a Lagos home fragrance house founded on a quiet conviction: a room should
              feel like somewhere you are cared for. We craft scented candles, reed diffusers, room
              sprays, and sculptural gypsum pieces designed to illuminate every space with warmth you
              can feel before you see it.
            </p>
          </div>
        </section>

        {/* The Gbagada Studio — Origin Story */}
        <section className="border-b border-clay/50 bg-sand/85">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.05fr_1fr]">
            <div className="relative overflow-hidden rounded-sm border border-clay/50 bg-secondary shadow-[var(--shadow-soft)]">
              <img
                src={images.storyStudio}
                alt="Ligera ribbed gypsum candle beside a Ligera reed diffuser"
                width={1280}
                height={720}
                className="aspect-[4/3] w-full object-cover"
              />
              <EditableImageTrigger
                imageKey="storyStudio"
                label="The Gbagada Studio"
                aspectHint="4:3 landscape"
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-forest/25 bg-card px-3.5 py-1.5">
                <img
                  src={assetSrc(logo)}
                  alt="Ligera emblem"
                  width={24}
                  height={24}
                  className="h-5 w-5 object-contain"
                />
                <span className="text-[11px] font-medium tracking-[0.22em] text-forest uppercase">
                  The Gbagada Studio
                </span>
              </div>

              <h2 className="mt-5 text-3xl leading-tight text-forest md:text-4xl">
                From a small studio table to homes across Lagos.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-ink/80">
                Ligera began in a sunlit studio on Onabola Street in Gbagada, testing wax blends,
                weighing fragrance accords, and casting mineral gypsum by hand until the balance felt
                effortless.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-ink/80">
                Instead of rushing to fill shelves, we chose slow curing and tactile vessels. Every
                candle is poured, levelled, and cured in small batches; every gypsum tray and vase is
                cast, hand-sanded smooth, and sealed against water and wax before it ever leaves our
                workbench.
              </p>
            </div>
          </div>
        </section>

        {/* How We Craft */}
        <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
          <div className="max-w-xl">
            <p className="eyebrow text-forest">Our Craft</p>
            <h2 className="mt-3 text-4xl text-forest md:text-5xl">
              Four families, one quiet standard
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/80">
              Whether it is a morning linen spray or a sculptural gypsum centerpiece, each piece is
              composed to belong naturally in your space.
            </p>
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            {craftPillars.map(({ icon: Icon, title, body, href, imageKey, alt }) => (
              <article
                key={title}
                className="overflow-hidden rounded-sm border border-clay/60 bg-card shadow-[var(--shadow-soft)]"
              >
                <div className="relative overflow-hidden">
                  {isVideoMediaUrl(images[imageKey]) ? (
                    <video
                      key={images[imageKey]}
                      src={images[imageKey]}
                      aria-label={alt}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <img
                      src={images[imageKey]}
                      alt={alt}
                      loading="lazy"
                      decoding="async"
                      width={1200}
                      height={900}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  )}
                  <EditableImageTrigger
                    imageKey={imageKey}
                    label={title}
                    aspectHint="4:3 landscape"
                  />
                </div>
                <div className="p-7">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sand text-forest">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <h3 className="mt-4 text-2xl text-forest">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/80">{body}</p>
                  <Link
                    href={href}
                    className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.18em] text-forest uppercase transition-colors hover:text-gold"
                  >
                    Explore {title}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Brand Values */}
        <section className="border-y border-gold/30 bg-forest text-forest-foreground">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <p className="eyebrow text-gold">What We Stand For</p>
            <h2 className="mt-3 text-4xl text-forest-foreground">
              Guided by warmth &amp; restraint
            </h2>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {values.map((v, idx) => (
                <div
                  key={v.title}
                  className="rounded-sm border border-forest-foreground/15 bg-forest-foreground/6 p-7"
                >
                  <p className="font-display text-sm text-gold">
                    {String(idx + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-2xl text-forest-foreground">{v.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-forest-foreground/80">
                    {v.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Optional CMS Sections */}
        {customSections && customSections.length > 0 && (
          <section className="mx-auto max-w-4xl px-5 py-20">
            <div className="space-y-12">
              {customSections.map((section, idx) => (
                <article key={idx} className="space-y-4">
                  {section.heading && <h2 className="text-3xl text-forest">{section.heading}</h2>}
                  {section.body && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
                      {section.body}
                    </p>
                  )}
                  {section.image?.url && (
                    <img
                      src={section.image.url}
                      alt={section.image.alt || section.heading || "Ligera story"}
                      loading="lazy"
                      decoding="async"
                      className="mt-4 w-full rounded-sm object-cover"
                    />
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Explore CTA */}
        <section className="mx-auto max-w-6xl px-5 pt-20 pb-10 md:pt-24 md:pb-12">
          <div className="rounded-sm border border-clay/65 border-l-4 border-l-gold bg-sand p-8 shadow-[var(--shadow-soft)] md:flex md:items-center md:justify-between md:gap-10 md:p-12">
            <div className="max-w-xl">
              <p className="eyebrow text-forest">Explore</p>
              <h2 className="mt-3 text-3xl text-forest md:text-4xl">
                Find the scent that belongs in your room
              </h2>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 md:mt-0 md:shrink-0">
              <Link href="/collections" className="btn-gold">
                Browse collections
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
              <Link href="/custom-orders" className="btn-forest">
                Make a custom order
              </Link>
            </div>
          </div>
        </section>

        {/* Visit us & Studio Map */}
        <section id="visit-us" className="mx-auto max-w-6xl px-5 pb-20 md:pb-24">
          <div className="overflow-hidden rounded-sm border border-clay/60 bg-card shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-5 border-b border-clay/45 bg-sage/20 p-8 md:flex-row md:items-end md:justify-between md:p-10">
              <div className="space-y-2">
                <h2 className="text-3xl text-forest md:text-4xl">Visit us</h2>
                <p className="mt-3 flex items-start gap-2 text-sm text-ink/80">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                  <span>
                    {STUDIO_ADDRESS.formatted} · Call or WhatsApp{" "}
                    <a
                      href="tel:08096613114"
                      className="font-medium text-forest underline underline-offset-4 transition-colors hover:text-gold"
                    >
                      {STUDIO_PHONE_DISPLAY}
                    </a>
                  </span>
                </p>
                <p className="flex items-start gap-2 text-xs text-ink/75">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={1.5} />
                  <span>{STUDIO_HOURS_DISPLAY} · Studio pickup available</span>
                </p>
              </div>
              <a
                href={STUDIO_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-forest shrink-0 self-start md:self-auto"
              >
                Open in Google Maps
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </a>
            </div>
            <div className="w-full bg-secondary/40">
              <iframe
                id="ligera-studio-google-map"
                name="ligera-studio-google-map"
                title={`Ligera Studio — ${STUDIO_ADDRESS.formatted}`}
                src={STUDIO_MAPS_EMBED_URL}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="h-[320px] w-full border-0 sm:h-[380px] md:h-[420px]"
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <SiteImageEditBar />
    </div>
  );
}
