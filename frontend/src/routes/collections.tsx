import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { categories } from "@/lib/products";
import { productsQuery } from "@/lib/products-query";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — Ligeria Candles, Diffusers & Gypsum Decor" },
      {
        name: "description",
        content:
          "Browse the Ligeria collection: hand-poured scented candles, reed diffusers, room sprays and gypsum decor, made in Lagos.",
      },
      { property: "og:title", content: "Collections — Ligeria" },
      {
        property: "og:description",
        content: "Scented candles, diffusers, room sprays and gypsum decor from Lagos.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  errorComponent: () => (
    <p className="p-10 text-center text-sm text-muted-foreground">
      We couldn't load the collection. Please refresh.
    </p>
  ),
  component: Collections,
});

function Collections() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const [active, setActive] = useState<string>("All");
  const shown = active === "All" ? products : products.filter((p) => p.category === active);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 pt-16 pb-10">
        <p className="eyebrow">The collection</p>
        <h1 className="mt-4 text-5xl md:text-6xl">Browse collections</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Four families, one intention — to illuminate every space with warmth you can feel before
          you see it.
        </p>

        <div className="mt-10 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={
                active === c
                  ? "rounded-sm bg-foreground px-4 py-2 text-[11px] tracking-[0.18em] text-primary-foreground uppercase"
                  : "rounded-sm border border-border px-4 py-2 text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:bg-secondary"
              }
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing in this family just yet.</p>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
