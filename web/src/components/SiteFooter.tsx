"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Instagram, MapPin, Phone } from "lucide-react";
import mark from "@/assets/ligera-mark-gold.png";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  STUDIO_ADDRESS,
  STUDIO_HOURS_DISPLAY,
  STUDIO_INSTAGRAM_HANDLE,
  STUDIO_INSTAGRAM_URL,
  STUDIO_PHONE_DISPLAY,
} from "@/lib/seo/site";

const shopLinks = [
  { href: "/collections", label: "All collections" },
  { href: "/collections/scented-candles", label: "Scented candles" },
  { href: "/collections/reed-diffusers", label: "Reed diffusers" },
  { href: "/collections/room-linen-sprays", label: "Room and linen spray" },
  { href: "/collections/gypsum-decor", label: "Gypsum decor" },
];

const exploreLinks = [
  { href: "/our-story", label: "Our story" },
  { href: "/custom-orders", label: "Custom & bespoke" },
  { href: "/delivery-returns", label: "Delivery & returns" },
  { href: "/faqs", label: "FAQs" },
  { href: "/candle-safety", label: "Candle safety" },
  { href: "/visit-us", label: "Visit the studio" },
];

export function SiteFooter() {
  return (
    <footer id="visit" className="bg-forest text-forest-foreground">
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-16">
        {/* Desktop: 4-column layout */}
        <div className="hidden gap-10 md:grid md:grid-cols-4">
          <div>
            <Image
              src={mark}
              alt="Ligera LG monogram"
              loading="lazy"
              width={1024}
              height={1024}
              className="h-12 w-12 object-contain"
            />
            <p className="mt-3 font-display text-2xl tracking-[0.2em] uppercase">Ligera</p>
            <p className="mt-1 font-display text-sm text-gold italic">Illuminate Every Space</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-forest-foreground/70">
              Hand-poured candles, diffusers, room sprays and gypsum decor, composed in small
              batches in Lagos with delivery across Lagos and nationwide in Nigeria.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Shop</p>
            {shopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-forest-foreground/75 transition-colors hover:text-forest-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Explore</p>
            {exploreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-forest-foreground/75 transition-colors hover:text-forest-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="space-y-3 text-sm">
            <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Visit the studio</p>
            <p className="flex items-start gap-2 text-forest-foreground/75">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.25} />
              <span>{STUDIO_ADDRESS.formatted}</span>
            </p>
            <p className="flex items-start gap-2 text-forest-foreground/75">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.25} />
              <span>{STUDIO_HOURS_DISPLAY} · Studio pickup available</span>
            </p>
            <a
              href="tel:08096613114"
              className="flex items-center gap-2 text-forest-foreground/75 hover:text-forest-foreground"
            >
              <Phone className="h-4 w-4" strokeWidth={1.25} />
              {STUDIO_PHONE_DISPLAY}
            </a>
            <a
              href={STUDIO_INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-forest-foreground/75 hover:text-forest-foreground"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.25} />
              {STUDIO_INSTAGRAM_HANDLE}
            </a>
          </div>
        </div>

        {/* Mobile: Brand intro + Accordion navigation */}
        <div className="md:hidden">
          <div className="pb-6">
            <Image
              src={mark}
              alt="Ligera LG monogram"
              loading="lazy"
              width={1024}
              height={1024}
              className="h-11 w-11 object-contain"
            />
            <p className="mt-3 font-display text-2xl tracking-[0.2em] uppercase">Ligera</p>
            <p className="mt-1 font-display text-sm text-gold italic">Illuminate Every Space</p>
            <p className="mt-3 text-sm leading-relaxed text-forest-foreground/70">
              Hand-poured candles, diffusers, room sprays and gypsum decor, made in Lagos with
              nationwide delivery.
            </p>
          </div>

          <Accordion type="multiple" className="border-t border-forest-foreground/15">
            <AccordionItem value="shop" className="border-forest-foreground/15">
              <AccordionTrigger className="text-[11px] tracking-[0.22em] text-gold uppercase hover:no-underline">
                Shop
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5 text-sm">
                {shopLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-forest-foreground/80 hover:text-forest-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="explore" className="border-forest-foreground/15">
              <AccordionTrigger className="text-[11px] tracking-[0.22em] text-gold uppercase hover:no-underline">
                Explore
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5 text-sm">
                {exploreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-forest-foreground/80 hover:text-forest-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="visit" className="border-forest-foreground/15">
              <AccordionTrigger className="text-[11px] tracking-[0.22em] text-gold uppercase hover:no-underline">
                Visit the studio
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm">
                <p className="flex items-start gap-2 text-forest-foreground/80">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.25} />
                  <span>{STUDIO_ADDRESS.formatted}</span>
                </p>
                <p className="flex items-start gap-2 text-forest-foreground/80">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.25} />
                  <span>{STUDIO_HOURS_DISPLAY} · Studio pickup available</span>
                </p>
                <a
                  href="tel:08096613114"
                  className="flex items-center gap-2 text-forest-foreground/80 hover:text-forest-foreground"
                >
                  <Phone className="h-4 w-4" strokeWidth={1.25} />
                  {STUDIO_PHONE_DISPLAY}
                </a>
                <a
                  href={STUDIO_INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-forest-foreground/80 hover:text-forest-foreground"
                >
                  <Instagram className="h-4 w-4" strokeWidth={1.25} />
                  {STUDIO_INSTAGRAM_HANDLE}
                </a>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <div className="border-t border-forest-foreground/15 px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] tracking-[0.22em] text-forest-foreground/60 uppercase">
            © {new Date().getFullYear()} Ligera · Gbagada, Lagos, Nigeria
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="text-[11px] tracking-[0.22em] text-forest-foreground/70 uppercase hover:text-gold"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-[11px] tracking-[0.22em] text-forest-foreground/70 uppercase hover:text-gold"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
