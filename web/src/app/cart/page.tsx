"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { naira, productImage } from "@/lib/products";

export default function CartPage() {
  const { lines: items, subtotal, setQty, remove } = useCart();
  const delivery = subtotal > 0 ? 3500 : 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 pt-16 pb-24">
        <p className="eyebrow text-forest">Your bag</p>
        <h1 className="mt-4 text-5xl text-forest">Gently gathered</h1>

        {items.length === 0 ? (
          <div className="mt-14 rounded-sm border border-clay/60 bg-sand/70 px-6 py-14 text-center">
            <p className="text-sm text-ink/80">Your bag is empty for now.</p>
            <Link href="/collections" className="btn-gold mt-6">
              Browse collections
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-14 md:grid-cols-[1.5fr_1fr]">
            <ul className="divide-y divide-clay/50 border-y border-clay/50">
              {items.map((product) => (
                <li key={product.id} className="flex gap-5 py-6">
                  <img
                    src={productImage(product)}
                    alt={product.name}
                    loading="lazy"
                    width={900}
                    height={900}
                    className="h-24 w-24 shrink-0 rounded-sm border border-clay/45 object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-xl leading-tight text-forest">
                          {product.name}
                        </h2>
                        <p className="mt-1 text-xs text-ink/70">{product.notes}</p>
                      </div>
                      <button
                        onClick={() => remove(product.id)}
                        aria-label={`Remove ${product.name}`}
                        className="text-ink/60 transition-colors hover:text-forest"
                      >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-sm border border-clay/65 bg-card px-3 py-1.5">
                        <button
                          onClick={() => setQty(product.id, product.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <span className="w-6 text-center text-sm">{product.qty}</span>
                        <button
                          onClick={() => setQty(product.id, product.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                      <p className="text-sm font-medium text-forest">
                        {naira(product.price * product.qty)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-sm border border-gold/25 bg-forest p-7 text-forest-foreground shadow-[var(--shadow-soft)]">
              <p className="eyebrow text-gold">Summary</p>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-forest-foreground/75">Subtotal</dt>
                  <dd className="text-forest-foreground">{naira(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-forest-foreground/75">Estimated delivery (Lagos)</dt>
                  <dd className="text-forest-foreground">{naira(delivery)}</dd>
                </div>
                <div className="flex justify-between border-t border-forest-foreground/20 pt-3 text-base">
                  <dt className="text-forest-foreground">Total</dt>
                  <dd className="font-medium text-forest-foreground">{naira(subtotal + delivery)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-forest-foreground/75">
                Lagos-first dispatch, nationwide Nigeria shipping &amp; Gbagada studio pickup available.{" "}
                <Link
                  href="/delivery-returns"
                  className="text-gold underline underline-offset-4 hover:text-forest-foreground"
                >
                  View delivery details
                </Link>
              </p>
              <Link href="/checkout" className="btn-gold mt-7 w-full">
                Checkout
              </Link>
              <Link href="/collections" className="btn-outline-light mt-3 w-full">
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

