import { Link } from "@tanstack/react-router";
import { Instagram, Phone, MapPin } from "lucide-react";
import mark from "@/assets/ligeria-mark-gold.png";

export function SiteFooter() {
  return (
    <footer id="visit" className="bg-forest text-forest-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3">
        <div>
          <img
            src={mark}
            alt="Ligeria LG monogram"
            loading="lazy"
            width={1024}
            height={1024}
            className="h-12 w-12 object-contain"
          />
          <p className="mt-3 font-display text-2xl tracking-[0.2em] uppercase">Ligeria</p>
          <p className="mt-1 font-display text-sm text-gold italic">Illuminate Every Space</p>
          <p className="mt-4 max-w-xs text-sm text-forest-foreground/70">
            Illuminate every space. Hand-poured candles, diffusers, room sprays and gypsum decor,
            made in Lagos.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Visit the studio</p>
          <p className="flex items-start gap-2 text-forest-foreground/75">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.25} />
            43 Onabola Street, Pedro Road, Gbagada, Lagos
          </p>
          <a
            href="tel:08096613114"
            className="flex items-center gap-2 text-forest-foreground/75 hover:text-forest-foreground"
          >
            <Phone className="h-4 w-4" strokeWidth={1.25} />
            0809 661 3114
          </a>
          <a
            href="https://instagram.com/_ligeria_"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-forest-foreground/75 hover:text-forest-foreground"
          >
            <Instagram className="h-4 w-4" strokeWidth={1.25} />
            @_ligeria_
          </a>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Shop</p>
          <Link to="/" className="block text-forest-foreground/75 hover:text-forest-foreground">
            Home
          </Link>
          <Link
            to="/collections"
            className="block text-forest-foreground/75 hover:text-forest-foreground"
          >
            Collections
          </Link>
          <Link to="/cart" className="block text-forest-foreground/75 hover:text-forest-foreground">
            Your bag
          </Link>
        </div>
      </div>
      <div className="border-t border-forest-foreground/15 px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] tracking-[0.22em] text-forest-foreground/60 uppercase">
            © {new Date().getFullYear()} Ligeria · Lagos, Nigeria
          </p>
          <Link
            to="/admin"
            className="text-[11px] tracking-[0.22em] text-gold/80 uppercase hover:text-gold"
          >
            Studio admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
