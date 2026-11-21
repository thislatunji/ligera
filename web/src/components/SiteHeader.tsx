"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, ShoppingBag } from "lucide-react";
import mark from "@/assets/ligera-mark-gold.png";
import { useCart } from "@/lib/cart";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const STUDIO_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=43+Onabola+Street%2C+Pedro+Road%2C+Gbagada%2C+Lagos";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/collections", label: "Collections" },
  { href: "/our-story", label: "Our Story" },
  { href: "/custom-orders", label: "Custom Orders" },
  { href: "/#reviews", label: "Reviews" },
];

export function SiteHeader() {
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-4 md:flex md:items-center md:justify-between">
        {/* Mobile slide-out menu (left on mobile, hidden on desktop) */}
        <div className="flex items-center justify-start md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-foreground"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" strokeWidth={1.5} />
                <span className="eyebrow">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col justify-between bg-background">
              <div>
                <SheetHeader className="border-b border-border/60 pb-4 text-left">
                  <SheetTitle className="font-display text-2xl tracking-[0.2em] text-forest uppercase">
                    Ligera
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-5" aria-label="Mobile navigation">
                  {navItems.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="font-display text-2xl text-foreground transition-colors hover:text-gold"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </div>

              <div className="border-t border-border/60 pt-5 text-xs text-muted-foreground">
                <a
                  href={STUDIO_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block transition-colors hover:text-foreground"
                >
                  <p className="eyebrow text-gold">Gbagada Studio</p>
                  <p className="mt-2 underline-offset-4 group-hover:underline">
                    43 Onabola Street, Pedro Road, Gbagada, Lagos
                  </p>
                </a>
                <a
                  href="tel:08096613114"
                  className="mt-1.5 inline-block py-0.5 transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
                >
                  0809 661 3114
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Link
          href="/"
          className="flex items-center justify-self-center gap-2.5 md:justify-self-auto"
          aria-label="Ligera home"
        >
          <Image
            src={mark}
            alt="Ligera LG monogram"
            width={1024}
            height={1024}
            className="h-9 w-9 object-contain md:h-10 md:w-10"
          />
          <span className="font-display text-xl tracking-[0.2em] text-forest uppercase md:text-2xl">
            Ligera
          </span>
        </Link>

        {/* Desktop horizontal navigation */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="eyebrow transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Cart */}
        <div className="flex items-center justify-end">
          <Link href="/cart" className="relative flex items-center gap-2" aria-label="View cart">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.25} />
            <span className="eyebrow hidden sm:inline">Bag</span>
            {count > 0 && (
              <span className="absolute -top-2 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
