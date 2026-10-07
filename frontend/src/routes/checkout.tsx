import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/products";
import { DELIVERY_FEE, placeOrder, useServerFn } from "@/lib/shop.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Ligeria" },
      {
        name: "description",
        content: "Complete your Ligeria order — delivery across Lagos and nationwide shipping.",
      },
      { property: "og:title", content: "Checkout — Ligeria" },
      { property: "og:description", content: "Complete your Ligeria home fragrance order." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { lines: items, subtotal, clear } = useCart();
  const [placed, setPlaced] = useState<{ reference: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitOrder = useServerFn(placeOrder);
  const delivery = subtotal > 0 ? DELIVERY_FEE : 0;

  if (placed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <section className="mx-auto max-w-lg px-5 py-28 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold text-accent-foreground">
            <Check className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <h1 className="mt-7 text-4xl">Thank you</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your order is received. Reference{" "}
            <span className="text-foreground">{placed.reference}</span>. We'll reach you on WhatsApp
            at 0809 661 3114 with bank transfer details and to confirm delivery within Lagos.
          </p>
          <Link to="/collections" className="btn-outline-soft mt-8">
            Continue browsing
          </Link>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 pt-16 pb-24">
        <p className="eyebrow">Checkout</p>
        <h1 className="mt-4 text-5xl">Almost yours</h1>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError("");
            setBusy(true);
            try {
              const result = await submitOrder({
                data: {
                  customerName: String(form.get("name") ?? ""),
                  email: String(form.get("email") ?? ""),
                  phone: String(form.get("phone") ?? ""),
                  address: String(form.get("address") ?? ""),
                  city: String(form.get("city") ?? ""),
                  state: String(form.get("state") ?? ""),
                  note: String(form.get("note") ?? ""),
                  items: items.map((l) => ({ id: l.id, qty: l.qty })),
                },
              });
              clear();
              setPlaced({ reference: result.reference });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not place your order.");
            } finally {
              setBusy(false);
            }
          }}
          className="mt-12 grid gap-14 md:grid-cols-[1.4fr_1fr]"
        >
          <div className="space-y-8">
            <fieldset className="space-y-4">
              <legend className="eyebrow mb-3">Contact</legend>
              <Field label="Full name" name="name" />
              <Field label="Email" name="email" type="email" />
              <Field label="Phone number" name="phone" type="tel" />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="eyebrow mb-3">Delivery</legend>
              <Field label="Street address" name="address" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City / Area" name="city" defaultValue="Gbagada" />
                <Field label="State" name="state" defaultValue="Lagos" />
              </div>
              <label className="block">
                <span className="eyebrow">Delivery note (optional)</span>
                <textarea
                  name="note"
                  rows={3}
                  className="mt-2 w-full rounded-sm border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
                />
              </label>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="eyebrow mb-3">Payment</legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-border px-4 py-3 text-sm">
                <input type="radio" name="payment" defaultChecked className="accent-[var(--gold)]" />
                Bank transfer
              </label>
            </fieldset>
          </div>

          <aside className="h-fit rounded-sm bg-secondary/50 p-7">
            <p className="eyebrow">Your order</p>
            <ul className="mt-5 space-y-4">
              {items.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {line.name} × {line.qty}
                  </span>
                  <span>{naira(line.price * line.qty)}</span>
                </li>
              ))}
              {items.length === 0 && (
                <li className="text-sm text-muted-foreground">Your bag is empty.</li>
              )}
            </ul>
            <dl className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{naira(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd>{naira(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-3 text-base">
                <dt>Total</dt>
                <dd>{naira(subtotal + delivery)}</dd>
              </div>
            </dl>
            {error && <p className="mt-5 text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={items.length === 0 || busy}
              className="btn-gold mt-7 w-full disabled:opacity-50"
            >
              {busy ? "Placing order…" : "Place order"}
            </button>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Questions? Call 0809 661 3114
            </p>
          </aside>
        </form>
      </section>

      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        required
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-sm border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}
