"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "./products";

export type CartLine = {
  id: string;
  variantId?: string;
  name: string;
  notes: string;
  category: string;
  price: number;
  imageUrl: string | null;
  qty: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (product: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ligera-cart-v2";
const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getCartLineKey(line: { id: string; variantId?: string }): string {
  return line.variantId || line.id;
}

function readStoredCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as CartLine[];
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
      if (
        typeof parsed.updatedAt === "number" &&
        Date.now() - parsed.updatedAt > CART_TTL_MS
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }
      return parsed.items as CartLine[];
    }
    return [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ items: lines, updatedAt: Date.now() })
      );
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  const add = useCallback((product: Product, qty = 1) => {
    const targetKey = getCartLineKey(product);
    setLines((prev) => {
      const found = prev.find((l) => getCartLineKey(l) === targetKey);
      if (found) {
        return prev.map((l) =>
          getCartLineKey(l) === targetKey ? { ...l, qty: l.qty + qty } : l
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          variantId: product.variantId,
          name: product.name,
          notes: product.notes,
          category: product.category,
          price: product.price,
          imageUrl: product.imageUrl,
          qty,
        },
      ];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) => {
      const hasLineKey = prev.some((l) => getCartLineKey(l) === key);
      const isMatch = (l: CartLine) =>
        hasLineKey ? getCartLineKey(l) === key : l.id === key;
      return qty <= 0
        ? prev.filter((l) => !isMatch(l))
        : prev.map((l) => (isMatch(l) ? { ...l, qty } : l));
    });
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => {
      const hasLineKey = prev.some((l) => getCartLineKey(l) === key);
      return prev.filter((l) =>
        hasLineKey ? getCartLineKey(l) !== key : l.id !== key
      );
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, add, setQty, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
