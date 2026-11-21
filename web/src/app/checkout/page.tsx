"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/products";
import { DELIVERY_FEE, listDeliveryZones, placeOrder } from "@/lib/api";

export default function CheckoutPage() {
  const { lines: items, subtotal, clear } = useCart();
  const { data: zones = [] } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: listDeliveryZones,
  });
  const [zoneId, setZoneId] = useState<string>("");
  const [placed, setPlaced] = useState<{ reference: string; paymentUrl?: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedZone = zones.find((z) => z.id === zoneId) ?? zones[0];
  const delivery = subtotal > 0 ? (selectedZone ? selectedZone.fee : DELIVERY_FEE) : 0;

  if (placed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <section className="mx-auto max-w-lg px-5 py-24">
          <div className="rounded-sm border border-clay/60 border-t-4 border-t-forest bg-card p-10 text-center shadow-[var(--shadow-soft)]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold text-accent-foreground">
              <Check className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <h1 className="mt-7 text-4xl text-forest">Thank you</h1>
            <p className="mt-4 text-sm leading-relaxed text-ink/80">
              Your order is received. Reference{" "}
              <span className="font-medium text-forest">{placed.reference}</span>. We&apos;ll reach
              you on WhatsApp at 0809 661 3114 with payment details and to confirm your delivery or
              Gbagada studio pickup.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {placed.paymentUrl && (
                <a href={placed.paymentUrl} className="btn-gold">
                  Complete payment
                </a>
              )}
              <Link href="/collections" className="btn-outline-soft">
                Continue browsing
              </Link>
            </div>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 pt-16 pb-24">
        <p className="eyebrow text-forest">Checkout</p>
        <h1 className="mt-4 text-5xl text-forest">Almost yours</h1>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError("");
            setBusy(true);
            try {
              const activeZoneId = selectedZone?.id;
              const result = await placeOrder({
                data: {
                  customerName: String(form.get("name") ?? ""),
                  email: String(form.get("email") ?? ""),
                  phone: String(form.get("phone") ?? ""),
                  address: String(form.get("address") ?? ""),
                  city: String(form.get("city") ?? ""),
                  state: String(form.get("state") ?? ""),
                  zoneId: activeZoneId,
                  deliveryMethod: activeZoneId ? "delivery" : "pickup",
                  note: String(form.get("note") ?? ""),
                  items: items.map((l) => ({ id: l.id, variantId: l.variantId, qty: l.qty })),
                },
              });
              clear();
              setPlaced({ reference: result.reference, paymentUrl: result.paymentUrl });
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
              <legend className="eyebrow mb-3 text-forest">Contact</legend>
              <Field label="Full name" name="name" />
              <Field label="Email" name="email" type="email" />
              <Field label="Phone number" name="phone" type="tel" />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="eyebrow mb-3 text-forest">Delivery</legend>
              {zones.length > 0 && (
                <label className="block">
                  <span className="eyebrow text-forest">Delivery zone</span>
                  <select
                    name="zoneId"
                    value={selectedZone?.id ?? ""}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — {naira(z.fee)}
                        {z.etaText ? ` (${z.etaText})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Field label="Street address" name="address" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City / Area" name="city" defaultValue="Gbagada" />
                <Field label="State" name="state" defaultValue="Lagos" />
              </div>
              <label className="block">
                <span className="eyebrow text-forest">Delivery note (optional)</span>
                <textarea
                  name="note"
                  rows={3}
                  className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
              </label>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="eyebrow mb-3 text-forest">Payment</legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-clay/65 bg-card px-4 py-3 text-sm text-ink">
                <input
                  type="radio"
                  name="payment"
                  defaultChecked
                  className="accent-[var(--gold)]"
                />
                Flutterwave / Bank transfer
              </label>
            </fieldset>
          </div>

          <aside className="h-fit rounded-sm border border-gold/25 bg-forest p-7 text-forest-foreground shadow-[var(--shadow-soft)]">
            <p className="eyebrow text-gold">Your order</p>
            <ul className="mt-5 space-y-4">
              {items.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-forest-foreground/75">
                    {line.name} × {line.qty}
                  </span>
                  <span className="text-forest-foreground">{naira(line.price * line.qty)}</span>
                </li>
              ))}
              {items.length === 0 && (
                <li className="text-sm text-forest-foreground/75">Your bag is empty.</li>
              )}
            </ul>
            <dl className="mt-6 space-y-3 border-t border-forest-foreground/20 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-forest-foreground/75">Subtotal</dt>
                <dd className="text-forest-foreground">{naira(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-forest-foreground/75">Delivery</dt>
                <dd className="text-forest-foreground">{naira(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-forest-foreground/20 pt-3 text-base">
                <dt className="text-forest-foreground">Total</dt>
                <dd className="font-medium text-forest-foreground">{naira(subtotal + delivery)}</dd>
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
            <p className="mt-4 text-center text-[11px] text-forest-foreground/75">
              Questions? Call{" "}
              <a
                href="tel:08096613114"
                className="text-gold underline underline-offset-4 hover:text-forest-foreground"
              >
                0809 661 3114
              </a>
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
      <span className="eyebrow text-forest">{label}</span>
      <input
        required
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
      />
    </label>
  );
}

