"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Minus, Plus, Sparkles } from "lucide-react";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/products";
import { findSeoCategory } from "@/lib/seo/categories";
import type { ProductDetailData } from "@/lib/seo/catalog.server";

export function ProductDetailClient({
  product,
}: {
  product: ProductDetailData;
}) {
  const { add } = useCart();
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const activeVariant = product.variants[selectedVariantIdx] ?? product.variants[0];
  const price = activeVariant
    ? activeVariant.salePrice ?? activeVariant.price
    : product.priceFrom;
  const availableStock = product.madeToOrder
    ? 99
    : activeVariant
      ? activeVariant.available
      : product.badge === "sold_out"
        ? 0
        : 10;
  const soldOut = !product.madeToOrder && availableStock <= 0;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [
          {
            url: product.imageUrl,
            alt: product.imageAlt || product.name,
            width: 900,
            height: 900,
          },
        ];
  const activeImage = images[selectedImageIdx] ?? images[0];

  const seoCat = findSeoCategory(product.category);
  const customHref = seoCat
    ? `/custom-orders?product=${encodeURIComponent(seoCat.customOrderValue)}`
    : "/custom-orders";

  const notesSummary = [
    ...(product.scentNotes?.top || []),
    ...(product.scentNotes?.heart || []),
    ...(product.scentNotes?.base || []),
  ].join(" · ");

  const handleAdd = () => {
    if (soldOut) return;
    add(
      {
        id: product.id,
        variantId: activeVariant?.id ?? product.variantId,
        slug: product.slug,
        name:
          product.variants.length > 1 && activeVariant
            ? `${product.name} (${activeVariant.label})`
            : product.name,
        notes: notesSummary || product.finish || product.category,
        category: product.category,
        price,
        stock: availableStock,
        imageUrl: product.imageUrl,
      },
      qty,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="grid gap-10 md:grid-cols-[1.05fr_1fr] md:gap-14">
      <div>
        <div className="relative overflow-hidden rounded-sm border border-border/60 bg-secondary/50">
          <img
            src={activeImage.url}
            alt={activeImage.alt || `${product.name} — ${product.category}`}
            width={activeImage.width || 900}
            height={activeImage.height || 900}
            className="aspect-square w-full object-cover"
          />
          {soldOut && (
            <span className="absolute top-3 left-3 rounded-full bg-background/90 px-3 py-1 text-[10px] tracking-[0.2em] uppercase">
              Sold out
            </span>
          )}
          {!soldOut && product.madeToOrder && (
            <span className="absolute top-3 left-3 rounded-full bg-forest px-3 py-1 text-[10px] tracking-[0.2em] text-forest-foreground uppercase">
              Made to order
            </span>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={`${img.url}-${idx}`}
                type="button"
                onClick={() => setSelectedImageIdx(idx)}
                className={`overflow-hidden rounded-sm border transition-colors ${
                  idx === selectedImageIdx ? "border-gold" : "border-border/60"
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt || product.name}
                  width={120}
                  height={120}
                  className="h-16 w-16 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center">
        <p className="eyebrow">{product.category}</p>
        <h1 className="mt-3 text-4xl leading-[1.08] sm:text-5xl">{product.name}</h1>

        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <p className="text-2xl font-normal text-foreground">{naira(price)}</p>
          {activeVariant?.salePrice != null && activeVariant.price > activeVariant.salePrice && (
            <p className="text-sm text-muted-foreground line-through">
              {naira(activeVariant.price)}
            </p>
          )}
          <span className="text-xs text-muted-foreground">
            {soldOut
              ? "Currently sold out"
              : product.madeToOrder
                ? product.leadTimeDays > 0
                  ? `Made to order (${product.leadTimeDays} days)`
                  : "Made to order"
                : activeVariant?.lowStock
                  ? "Low stock — limited batch"
                  : "In stock · Ready for Lagos dispatch"}
          </span>
        </div>

        {product.description && (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {product.description}
          </p>
        )}

        {product.variants.length > 1 && (
          <div className="mt-6">
            <p className="eyebrow">Size / Option</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {product.variants.map((variant, idx) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantIdx(idx)}
                  disabled={variant.soldOut && !product.madeToOrder}
                  className={`rounded-sm border px-4 py-2 text-xs transition-colors ${
                    idx === selectedVariantIdx
                      ? "border-foreground bg-foreground text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  } disabled:opacity-40`}
                >
                  {variant.label} · {naira(variant.salePrice ?? variant.price)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-sm border border-border bg-card px-3 py-2.5">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="text-muted-foreground hover:text-foreground"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <span className="w-6 text-center text-sm">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(Math.max(1, availableStock), q + 1))}
              aria-label="Increase quantity"
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className="btn-gold flex-1 sm:flex-none disabled:opacity-45"
          >
            {soldOut ? (
              "Sold out"
            ) : added ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
                Added to bag
              </>
            ) : (
              "Add to bag"
            )}
          </button>

          {added && (
            <Link href="/cart" className="btn-outline-soft">
              View bag
            </Link>
          )}
        </div>

        <div className="mt-4">
          <Link
            href={customHref}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            Order custom labels, scents, or bulk gifting for {product.name}
          </Link>
        </div>
      </div>
    </div>
  );
}
