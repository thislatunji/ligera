import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import mark from "@/assets/ligeria-mark-gold.png";
import { useCart } from "@/lib/cart";

export function SiteHeader() {
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Ligeria home">
          <img
            src={mark}
            alt="Ligeria LG monogram"
            width={1024}
            height={1024}
            className="h-10 w-10 object-contain"
          />
          <span className="font-display text-2xl tracking-[0.2em] text-forest uppercase">Ligeria</span>
        </Link>

        <nav className="flex items-center gap-5 md:gap-9">
          <Link to="/" className="eyebrow hover:text-foreground">
            Home
          </Link>
          <Link to="/collections" className="eyebrow hover:text-foreground">
            Collections
          </Link>
          <a href="/#story" className="eyebrow hidden hover:text-foreground md:inline">
            Our Story
          </a>
          <a href="/#visit" className="eyebrow hidden hover:text-foreground md:inline">
            Visit
          </a>
        </nav>

        <Link to="/cart" className="relative flex items-center gap-2" aria-label="View cart">
          <ShoppingBag className="h-5 w-5" strokeWidth={1.25} />
          <span className="eyebrow hidden sm:inline">Bag</span>
          {count > 0 && (
            <span className="absolute -top-2 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-accent-foreground">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
