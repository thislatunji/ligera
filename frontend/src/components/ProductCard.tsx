import { naira, productImage, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const soldOut = product.stock <= 0;

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-sm bg-secondary/60">
        <img
          src={productImage(product)}
          alt={`${product.name} — ${product.category}`}
          loading="lazy"
          width={900}
          height={900}
          className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        {soldOut && (
          <span className="absolute top-3 left-3 rounded-full bg-background/90 px-3 py-1 text-[10px] tracking-[0.2em] uppercase">
            Sold out
          </span>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl leading-tight">{product.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{product.notes}</p>
        </div>
        <p className="text-sm whitespace-nowrap">{naira(product.price)}</p>
      </div>
      <button
        onClick={() => add(product)}
        disabled={soldOut}
        className="btn-outline-soft mt-4 w-full disabled:opacity-40"
      >
        {soldOut ? "Sold out" : "Add to bag"}
      </button>
    </article>
  );
}
