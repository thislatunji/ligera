"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { Amphora, ArrowRight, Leaf, Quote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { EditableImageTrigger, SiteImageEditBar } from "@/components/EditableImageSlot";
import { LazyCategoryVideo } from "@/components/LazyCategoryVideo";
import { ReelReviewCard } from "@/components/ReelReviewCard";
import { SeamlessVideoLoop } from "@/components/SeamlessVideoLoop";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { signatureProducts, type Product } from "@/lib/products";
import { productsQuery } from "@/lib/products-query";
import { SEO_CATEGORIES } from "@/lib/seo/categories";
import { isVideoMediaUrl, useSiteImages, type SiteImageKey } from "@/lib/site-images";

const categoryImageKeys: Record<string, SiteImageKey> = {
  "scented-candles": "categoryCandles",
  "reed-diffusers": "categoryDiffusers",
  "room-linen-sprays": "categorySprays",
  "gypsum-decor": "categoryGypsum",
};

const categoryCards = SEO_CATEGORIES.map((cat) => ({
  title: cat.shortTitle,
  subtitle: cat.subtitle,
  href: `/collections/${cat.slug}`,
  imageKey: categoryImageKeys[cat.slug],
  poster: cat.posterImage,
  alt: cat.alt,
}));

type Testimonial =
  | {
      id: string;
      type: "reel";
      handle: string;
    }
  | {
      id: string;
      type: "text";
      quote: string;
      author: string;
      location: string;
      product: string;
    };

const testimonials: Testimonial[] = [
  {
    id: "reel-1",
    type: "reel",
    handle: "@ligera.est26",
  },
  {
    id: "review-2",
    type: "text",
    quote:
      "We ordered custom diffusers and arch trays for our short-let apartments. Every guest asks what scent is in the hallway.",
    author: "Chidinma O.",
    location: "Victoria Island, Lagos",
    product: "Saffron Reed & Custom Order",
  },
  {
    id: "review-3",
    type: "text",
    quote:
      "The Curve Vase and Linen Morning candle arrived beautifully wrapped — the gypsum finish feels substantial and timeless.",
    author: "Damilola K.",
    location: "Lekki Phase 1",
    product: "Linen Morning & Curve Vase",
  },
  {
    id: "review-4",
    type: "text",
    quote:
      "Soft Veil on freshly laundered sheets is my favorite weekend ritual. Clean floral warmth that actually lingers.",
    author: "Aisha B.",
    location: "Abuja",
    product: "Soft Veil Room Spray",
  },
];

function PouringIcon({
  className,
  strokeWidth = 1.25,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon="pouring"
      className={className}
      {...props}
    >
      <path d="M9.5 4 3.8 9.7a2 2 0 0 0 0 2.8l3.6 3.6a2 2 0 0 0 2.9.1L16.5 10.5Z" />
      <path d="M7.5 6 6.4 4.9a2.12 2.12 0 0 0-3 3L4.5 9" />
      <path d="M3.3 11.5h12.1" />
      <path d="M16.5 10.5c2 0 3 1.2 3 3.5" />
      <path d="M19.5 16c-.8 1.2-2 2.4-2 3.5a2 2 0 0 0 4 0c0-1.1-1.2-2.3-2-3.5Z" />
    </svg>
  );
}

const storyPillars: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
}[] = [
  { icon: PouringIcon, title: "Hand-poured" },
  { icon: Leaf, title: "Softly composed" },
  { icon: Amphora, title: "Sculpted vessels" },
];

export function HomeClient({
  initialProducts = signatureProducts,
}: {
  initialProducts?: Product[];
}) {
  const { data: products = initialProducts } = useQuery({
    ...productsQuery,
    initialData: initialProducts,
  });
  const { images, defaultImages } = useSiteImages();

  return (
    <div className="min-h-screen">
      {/* 1. Header: Desktop Horizontal Navigation / Mobile Logo + Menu + Cart */}
      <SiteHeader />

      <main>
        {/* 2. Hero: Large Editorial Overlay Layout (Mobile & Desktop) */}
        <section className="relative min-h-[78vh] overflow-hidden md:min-h-[82vh]">
          <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
            <SeamlessVideoLoop
              key={images.homeHero}
              src={images.homeHero}
              poster={images.homeHero === defaultImages.homeHero ? "/hero-poster.jpg" : undefined}
              className="h-full w-full object-cover"
            />
          </div>
          <EditableImageTrigger
            imageKey="homeHero"
            label="Hero video / banner"
            aspectHint="16:9 / 4:3 loop (.mp4 or .webm)"
            positionClassName="top-4 right-4 z-30"
          />
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-background via-background/70 to-background/15" />
          <div className="relative z-20 mx-auto flex min-h-[78vh] w-full max-w-6xl items-end px-5 pt-24 pb-12 md:min-h-[82vh] md:pb-16">
            <div>
              <h1 className="max-w-xl text-4xl leading-[1.06] sm:text-6xl md:text-7xl">
                Illuminate <em className="not-italic text-gold">every</em> space
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/75 md:mt-5">
                Quiet luxury for the home — hand-poured candles, reed diffusers, room sprays and
                sculptural gypsum, composed in small batches in Lagos.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 md:mt-8">
                <Link href="/collections" className="btn-gold">
                  Browse collections
                </Link>
                <Link href="/our-story" className="btn-outline-soft">
                  Our story
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Category: Desktop 4-column grid / Mobile 2-column cards */}
        <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-forest">Collections</p>
              <h2 className="mt-3 text-3xl text-forest md:text-4xl">Shop by family</h2>
            </div>
            <Link href="/collections" className="eyebrow text-forest hover:text-gold">
              Explore all →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-10 lg:grid-cols-2 lg:gap-8">
            {categoryCards.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                className="group relative overflow-hidden rounded-sm border border-clay/60 bg-sand/75 shadow-[var(--shadow-soft)] transition-colors hover:border-gold"
              >
                <div className="relative overflow-hidden">
                  {isVideoMediaUrl(images[cat.imageKey]) ? (
                    <LazyCategoryVideo
                      key={images[cat.imageKey]}
                      src={images[cat.imageKey]}
                      poster={cat.poster}
                      alt={cat.alt}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <img
                      src={images[cat.imageKey]}
                      alt={cat.alt}
                      loading="lazy"
                      decoding="async"
                      width={900}
                      height={900}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                  <EditableImageTrigger
                    imageKey={cat.imageKey}
                    label={cat.title}
                    aspectHint="4:3 landscape"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-3.5 sm:gap-3 sm:p-5 lg:gap-4 lg:p-6">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg leading-tight text-forest sm:text-2xl lg:text-3xl">
                      {cat.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] text-ink/75 sm:text-xs lg:text-sm">
                      {cat.subtitle}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-gold transition-transform duration-300 group-hover:translate-x-1 lg:h-5 lg:w-5"
                    strokeWidth={1.5}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Products: Desktop 4-column grid / Mobile 2-column grid */}
        <section className="mx-auto max-w-6xl px-5 pb-16 md:pb-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-forest">Signature</p>
              <h2 className="mt-3 text-3xl text-forest md:text-4xl">Best loved</h2>
            </div>
            <Link href="/collections" className="eyebrow text-forest hover:text-gold">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:mt-10 lg:grid-cols-4 lg:gap-10">
            {products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* 5. Editorial Sections: Desktop Full-width imagery / Mobile Full-width stacked */}
        <section id="story" className="w-full border-y border-clay/55 bg-sand/90">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative w-full overflow-hidden">
              <img
                src={images.homeEditorialStory}
                alt="Ligera studio craftsmanship and home fragrance spray"
                loading="lazy"
                decoding="async"
                width={1200}
                height={1000}
                className="aspect-[4/3] w-full object-cover md:aspect-auto md:h-full md:min-h-[540px]"
              />
              <EditableImageTrigger
                imageKey="homeEditorialStory"
                label="Editorial — Our story"
                aspectHint="Landscape / split column"
                positionClassName="top-4 right-4"
              />
            </div>

            <div className="flex flex-col justify-center px-6 py-12 md:px-14 md:py-20 lg:px-20">
              <p className="eyebrow text-forest">Our story</p>
              <h2 className="mt-4 text-3xl leading-tight text-forest md:text-5xl">
                Scent is the softest kind of luxury.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-ink/80">
                Ligera began in a small Gbagada studio with one idea: that a room should feel like
                somewhere you are cared for. Every candle is poured, cured and finished by hand; every
                gypsum piece is cast, sanded and sealed before it earns our mark.
              </p>

              <div
                data-testid="story-pillars"
                className="mt-8 grid grid-cols-3 gap-3 border-t border-clay/60 pt-8 sm:gap-6"
              >
                {storyPillars.map(({ icon: Icon, title }) => (
                  <div key={title} className="min-w-0">
                    <Icon className="h-5 w-5 text-gold" strokeWidth={1.25} />
                    <h3 className="mt-2.5 text-base leading-snug text-forest sm:mt-3 sm:text-lg">
                      {title}
                    </h3>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link href="/our-story" className="btn-gold">
                  Read our full story
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full bg-forest text-forest-foreground">
          <div className="relative grid grid-cols-1 md:min-h-[460px] md:grid-cols-1">
            <img
              src={images.homeEditorialBespoke}
              alt="Custom gypsum vessels and bespoke home fragrance gifting"
              loading="lazy"
              decoding="async"
              width={1600}
              height={900}
              className="aspect-[16/10] w-full object-cover md:absolute md:inset-0 md:aspect-auto md:h-full"
            />
            <EditableImageTrigger
              imageKey="homeEditorialBespoke"
              label="Editorial — Bespoke & Gifting"
              aspectHint="Wide banner (16:10)"
              positionClassName="top-4 right-4"
            />
            <div className="hidden md:absolute md:inset-0 md:block md:bg-gradient-to-r md:from-forest/95 md:via-forest/75 md:to-forest/35" />
            <div className="relative mx-auto flex w-full max-w-6xl items-center px-6 py-12 md:min-h-[460px] md:px-5 md:py-20">
              <div className="max-w-lg">
                <p className="text-[11px] tracking-[0.22em] text-gold uppercase">
                  Bespoke &amp; Gifting
                </p>
                <h2 className="mt-3 text-3xl leading-tight md:text-5xl">
                  Custom fragrance for your spaces &amp; gatherings
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-forest-foreground/80">
                  Hosting a wedding, curating a short-let residence, or creating branded gifts? Tell
                  us what your space calls for and our Gbagada studio will prepare a tailored quote.
                </p>
                <Link href="/custom-orders" className="btn-gold mt-7">
                  Request custom order
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Testimonials: Desktop Carousel / Mobile Swipeable Cards */}
        <section id="reviews" className="scroll-mt-20 border-t border-clay/50 bg-sand/70">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl text-forest md:text-4xl">Words from our community</h2>
              <p className="text-xs text-ink/70 md:hidden">Swipe to read more →</p>
            </div>

            <div className="mt-8 md:mt-10 md:px-10">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-4 pb-2">
                  {testimonials.map((item) => (
                    <CarouselItem
                      key={item.id}
                      className="basis-[85%] pl-4 sm:basis-[70%] md:basis-1/2 lg:basis-1/3"
                    >
                      {item.type === "reel" ? (
                        <ReelReviewCard
                          src={images.reviewReel}
                          handle={item.handle}
                        />
                      ) : (
                        <article className="flex h-full flex-col justify-between rounded-sm border border-clay/60 border-t-4 border-t-gold bg-card p-6 text-center shadow-[var(--shadow-soft)] sm:p-8">
                          <div className="flex flex-1 flex-col items-center justify-center">
                            <Quote className="h-6 w-6 text-gold" strokeWidth={1.25} />
                            <p className="mt-5 text-lg leading-relaxed text-ink/85 sm:text-xl">
                              “{item.quote}”
                            </p>
                          </div>
                          <div className="mt-6 border-t border-clay/45 pt-4">
                            <p className="font-display text-xl text-forest">{item.author}</p>
                            <p className="mt-1 text-sm text-ink/75">
                              {item.location} · {item.product}
                            </p>
                          </div>
                        </article>
                      )}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer: Desktop 4-column layout / Mobile Accordion navigation */}
      <SiteFooter />
      <SiteImageEditBar />
    </div>
  );
}
