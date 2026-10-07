import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Leaf, Sparkles } from "lucide-react";
import hero from "@/assets/hero.jpg";
import logo from "@/assets/ligeria-logo-green.png";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productsQuery } from "@/lib/products-query";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ligeria — Illuminate Every Space | Lagos Home Fragrance" },
      {
        name: "description",
        content:
          "Ligeria is a Lagos home fragrance house crafting scented candles, reed diffusers, room sprays and gypsum decor. Illuminate every space.",
      },
      { property: "og:title", content: "Ligeria — Illuminate Every Space" },
      {
        property: "og:description",
        content:
          "Hand-poured candles, diffusers, room sprays and gypsum decor, made in Gbagada, Lagos.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  errorComponent: () => (
    <p className="p-10 text-center text-sm text-muted-foreground">
      Something went wrong loading the page. Please refresh.
    </p>
  ),
  component: Home,
});

function Home() {
  const { data: products } = useSuspenseQuery(productsQuery);
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative">
        <img
          src={hero}
          alt="Lit Ligeria candle in a ribbed gypsum vessel beside a reed diffuser"
          width={1600}
          height={1200}
          className="h-[78vh] min-h-[520px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-6xl px-5 pb-14">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-gold/50 bg-background/70 px-4 py-2 backdrop-blur-sm">
              <img src={logo} alt="Ligeria emblem" width={28} height={28} className="h-6 w-6 object-contain" />
              <span className="text-[11px] font-semibold tracking-[0.28em] text-gold uppercase">
                Lagos · Home Fragrance
              </span>
            </div>
            <h1 className="mt-5 max-w-xl text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
              Illuminate <em className="not-italic text-gold">every</em> space
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-foreground/75">
              Quiet luxury for the home — hand-poured candles, reed diffusers, room sprays and
              sculptural gypsum, composed in small batches.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/collections" className="btn-gold">
                Browse collections
              </Link>
              <a href="#story" className="btn-outline-soft">
                Our story
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            { icon: Flame, title: "Hand-poured", body: "Small batches, clean-burning wax, cotton wicks trimmed by hand." },
            { icon: Leaf, title: "Softly composed", body: "Layered notes tuned to linger gently — never loud, never sharp." },
            { icon: Sparkles, title: "Sculpted vessels", body: "Gypsum and glass forms designed to stay on your shelf for years." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="h-6 w-6 text-gold" strokeWidth={1.25} />
              <h3 className="mt-4 text-2xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section id="story" className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1fr_1.2fr]">
          <img
            src={logo}
            alt="Ligeria emblem"
            loading="lazy"
            width={1024}
            height={1024}
            className="mx-auto w-56 object-contain"
          />
          <div>
            <p className="eyebrow">Our story</p>
            <h2 className="mt-4 text-4xl leading-tight md:text-5xl">
              Scent is the softest kind of luxury.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Ligeria began in a small Gbagada studio with one idea: that a room should feel like
              somewhere you are cared for. Every candle is poured, cured and finished by hand; every
              gypsum piece is cast, sanded and sealed before it earns our mark.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The result is a house of fragrance that speaks quietly — warm, clean, and unmistakably
              considered.
            </p>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Signature</p>
            <h2 className="mt-3 text-4xl">Best loved</h2>
          </div>
          <Link to="/collections" className="eyebrow hover:text-foreground">
            View all →
          </Link>
        </div>
        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
