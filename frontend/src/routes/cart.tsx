import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { naira, productImage } from "@/lib/products";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Bag — Ligeria" },
      {
        name: "description",
        content: "Review the Ligeria candles, diffusers and decor in your bag before checkout.",
      },
      { property: "og:title", content: "Your Bag — Ligeria" },
      { property: "og:description", content: "Review your Ligeria selections before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines: items, subtotal, setQty, remove } = useCart();
  const delivery = subtotal > 0 ? 3500 : 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 pt-16 pb-24">
        <p className="eyebrow">Your bag</p>
        <h1 className="mt-4 text-5xl">Gently gathered</h1>

        {items.length === 0 ? (
          <div className="mt-14 border-t border-border/60 pt-14 text-center">
            <p className="text-sm text-muted-foreground">Your bag is empty for now.</p>
            <Link to="/collections" className="btn-gold mt-6">
              Browse collections
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-14 md:grid-cols-[1.5fr_1fr]">
            <ul className="divide-y divide-border/60 border-y border-border/60">
              {items.map((product) => (
                <li key={product.id} className="flex gap-5 py-6">
                  <img
                    src={productImage(product)}
                    alt={product.name}
                    loading="lazy"
                    width={900}
                    height={900}
                    className="h-24 w-24 shrink-0 rounded-sm object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-xl leading-tight">{product.name}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{product.notes}</p>
                      </div>
                      <button
                        onClick={() => remove(product.id)}
                        aria-label={`Remove ${product.name}`}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-sm border border-border px-3 py-1.5">
                        <button onClick={() => setQty(product.id, product.qty - 1)} aria-label="Decrease quantity">
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <span className="w-6 text-center text-sm">{product.qty}</span>
                        <button onClick={() => setQty(product.id, product.qty + 1)} aria-label="Increase quantity">
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                      <p className="text-sm">{naira(product.price * product.qty)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-sm bg-secondary/50 p-7">
              <p className="eyebrow">Summary</p>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{naira(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery (Lagos)</dt>
                  <dd>{naira(delivery)}</dd>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-3 text-base">
                  <dt>Total</dt>
                  <dd>{naira(subtotal + delivery)}</dd>
                </div>
              </dl>
              <Link to="/checkout" className="btn-gold mt-7 w-full">
                Checkout
              </Link>
              <Link to="/collections" className="btn-outline-soft mt-3 w-full">
                Keep browsing
              </Link>
            </aside>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
