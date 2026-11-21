"use client";

import Link from "next/link";
import { EditableProductImageTrigger } from "@/components/EditableImageSlot";
import { naira, productImage, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const soldOut = product.stock <= 0;
  const href = `/products/${product.slug}`;

  return (
    <article className="group flex min-w-0 flex-col">
      <div className="relative overflow-hidden rounded-sm bg-secondary/60">
        <Link href={href} className="block" aria-label={product.name}>
          <img
            src={productImage(product)}
            alt={`${product.name} — ${product.category}`}
            loading="lazy"
            decoding="async"
            width={900}
            height={900}
            className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        </Link>
        <EditableProductImageTrigger product={product} />
        {soldOut && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-background/90 px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase">
            Sold out
          </span>
        )}
      </div>
      <div className="mt-3.5 flex flex-1 flex-col justify-between gap-2 sm:mt-4 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0">
          <Link href={href} className="transition-colors hover:text-gold">
            <h3 className="font-display text-base leading-tight sm:text-xl">{product.name}</h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground sm:text-xs">
            {product.notes}
          </p>
        </div>
        <p className="text-xs font-medium whitespace-nowrap sm:text-sm sm:font-normal">
          {naira(product.price)}
        </p>
      </div>
      <button
        onClick={() => add(product)}
        disabled={soldOut}
        className="btn-outline-soft mt-3.5 w-full px-3 py-2.5 sm:mt-4 sm:px-5 sm:py-3.5 disabled:opacity-40"
      >
        {soldOut ? "Sold out" : "Add to bag"}
      </button>
    </article>
  );
}
