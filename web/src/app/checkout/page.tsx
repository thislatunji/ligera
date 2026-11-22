"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Lock, MapPin, Store, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCartLineKey, useCart } from "@/lib/cart";
import { naira } from "@/lib/products";
import {
  DELIVERY_FEE,
  fetchCheckoutQuote,
  listDeliveryZones,
  placeOrder,
} from "@/lib/api";
import {
  STUDIO_ADDRESS,
  STUDIO_HOURS_DISPLAY,
  STUDIO_PHONE_DISPLAY,
} from "@/lib/seo/site";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NG_PHONE_REGEX = /^(\+?234|0)\d{9,10}$/;

function normalizePhoneInput(raw: string): string {
  return raw.trim().replace(/[\s()-]+/g, "");
}

export default function CheckoutPage() {
  const { lines: items, subtotal } = useCart();
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: listDeliveryZones,
  });

  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [zoneId, setZoneId] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Gbagada");
  const [state, setState] = useState("Lagos");
  const [note, setNote] = useState("");
  const [hidePrices, setHidePrices] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRedirecting = useRef(false);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === zoneId) ?? zones[0],
    [zones, zoneId]
  );

  const quoteItems = useMemo(
    () =>
      items.map((l) => ({
        variantId: l.variantId ?? l.id,
        qty: l.qty,
      })),
    [items]
  );

  const canFetchQuote =
    items.length > 0 &&
    (deliveryMethod === "pickup" || Boolean(selectedZone?.id));

  const { data: quote } = useQuery({
    queryKey: [
      "checkout-quote",
      deliveryMethod,
      deliveryMethod === "delivery" ? selectedZone?.id ?? "" : "pickup",
      quoteItems,
    ],
    queryFn: () =>
      fetchCheckoutQuote({
        items: quoteItems,
        deliveryMethod,
        zoneId: deliveryMethod === "delivery" ? selectedZone?.id : undefined,
      }),
    enabled: canFetchQuote,
    retry: false,
  });

  const fallbackDeliveryFee =
    deliveryMethod === "pickup"
      ? 0
      : subtotal > 0
        ? selectedZone
          ? selectedZone.fee
          : DELIVERY_FEE
        : 0;

  const displaySubtotal = quote?.subtotal ?? subtotal;
  const displayDelivery = quote?.deliveryFee ?? fallbackDeliveryFee;
  const displayTotal = quote?.total ?? displaySubtotal + displayDelivery;
  const displayWindow =
    quote?.expectedDeliveryWindow ||
    (deliveryMethod === "pickup"
      ? "Studio pickup — Ready within 24 hours (Mon–Sat, 9:00 AM – 6:00 PM WAT)"
      : selectedZone?.etaText || "");

  const hasFormData = Boolean(
    name.trim() || email.trim() || phone.trim() || address.trim() || note.trim()
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasFormData || isRedirecting.current) return;
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const normalizedPhone = normalizePhoneInput(phone);

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const msg = "Please enter a valid email address.";
      setEmailError(msg);
      setError(msg);
      return;
    }
    if (!NG_PHONE_REGEX.test(normalizedPhone)) {
      const msg = "Enter a valid Nigerian phone number (e.g. 0809 661 3114).";
      setPhoneError(msg);
      setError(msg);
      return;
    }

    if (deliveryMethod === "delivery") {
      if (!selectedZone?.id) {
        setError("Choose a delivery zone.");
        return;
      }
      if (address.trim().length < 4) {
        setError("Please enter your street address.");
        return;
      }
      if (!city.trim() || state.trim().length < 2) {
        setError("Please enter your city/area and state.");
        return;
      }
    }

    setBusy(true);
    try {
      const result = await placeOrder({
        data: {
          customerName: trimmedName,
          email: trimmedEmail,
          phone: normalizedPhone,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zoneId: deliveryMethod === "delivery" ? selectedZone?.id : undefined,
          deliveryMethod,
          note: note.trim(),
          hidePrices,
          items: items.map((l) => ({
            id: l.id,
            variantId: l.variantId,
            qty: l.qty,
          })),
        },
      });

      if (result.reference) {
        try {
          sessionStorage.setItem("ligera_pending_order", result.reference);
        } catch {
          // ignore storage errors
        }
      }

      if (!result.paymentUrl) {
        setBusy(false);
        setError("We couldn't start your payment. Please try again.");
        return;
      }

      isRedirecting.current = true;
      window.location.href = result.paymentUrl;
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof Error ? err.message : "Could not place your order."
      );
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <section className="mx-auto max-w-5xl px-5 pt-16 pb-24">
          <p className="eyebrow text-forest">Checkout</p>
          <h1 className="mt-4 text-5xl text-forest">Your bag is empty</h1>
          <div className="mt-10 rounded-sm border border-clay/60 bg-sand/70 px-6 py-14 text-center">
            <p className="text-sm text-ink/80">
              Add a candle, diffuser, spray, or gypsum piece to your bag before checking out.
            </p>
            <Link href="/collections" className="btn-gold mt-6">
              Browse collections
            </Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 pt-12 pb-24">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/cart"
            onClick={(e) => {
              if (
                hasFormData &&
                !window.confirm(
                  "You have unsaved checkout details — are you sure you want to leave?"
                )
              ) {
                e.preventDefault();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] text-ink/70 uppercase transition-colors hover:text-forest"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back to bag
          </Link>
          <p className="eyebrow text-forest">Step 1 of 2 — Your details</p>
        </div>

        <h1 className="text-5xl text-forest">Guest checkout</h1>
        <p className="mt-3 text-sm text-ink/75">
          No account needed. Enter your contact and delivery details to continue to Flutterwave.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-12 grid gap-14 md:grid-cols-[1.4fr_1fr]"
        >
          <div className="space-y-8">
            <fieldset className="space-y-4">
              <legend className="eyebrow mb-3 text-forest">Contact</legend>
              <label className="block">
                <span className="eyebrow text-forest">Full name</span>
                <input
                  required
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
              </label>

              <label className="block">
                <span className="eyebrow text-forest">Email</span>
                <input
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  onBlur={() => {
                    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
                      setEmailError("Please enter a valid email address.");
                    }
                  }}
                  placeholder="Required for your order receipt"
                  className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
                {emailError && (
                  <p className="mt-1.5 text-xs text-destructive">{emailError}</p>
                )}
              </label>

              <label className="block">
                <span className="eyebrow text-forest">Phone number</span>
                <input
                  required
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  onBlur={() => {
                    const normalized = normalizePhoneInput(phone);
                    if (normalized && !NG_PHONE_REGEX.test(normalized)) {
                      setPhoneError(
                        "Enter a valid Nigerian phone number (e.g. 0809 661 3114)."
                      );
                    }
                  }}
                  placeholder="e.g. 0809 661 3114"
                  className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
                {phoneError && (
                  <p className="mt-1.5 text-xs text-destructive">{phoneError}</p>
                )}
              </label>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="eyebrow mb-3 text-forest">Fulfilment</legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery method">
                <button
                  type="button"
                  role="radio"
                  aria-checked={deliveryMethod === "delivery"}
                  onClick={() => {
                    setDeliveryMethod("delivery");
                    setError("");
                  }}
                  className={`flex items-center gap-3 rounded-sm border px-4 py-3.5 text-left text-sm transition-colors ${
                    deliveryMethod === "delivery"
                      ? "border-forest bg-sand/70 text-forest"
                      : "border-clay/65 bg-card text-ink/80 hover:border-forest/60"
                  }`}
                >
                  <Truck className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                  <div>
                    <p className="font-medium">Local Delivery</p>
                    <p className="text-xs text-ink/70">Lagos zone dispatch</p>
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={deliveryMethod === "pickup"}
                  onClick={() => {
                    setDeliveryMethod("pickup");
                    setError("");
                  }}
                  className={`flex items-center gap-3 rounded-sm border px-4 py-3.5 text-left text-sm transition-colors ${
                    deliveryMethod === "pickup"
                      ? "border-forest bg-sand/70 text-forest"
                      : "border-clay/65 bg-card text-ink/80 hover:border-forest/60"
                  }`}
                >
                  <Store className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                  <div>
                    <p className="font-medium">Gbagada Studio Pickup</p>
                    <p className="text-xs text-ink/70">Free (₦0)</p>
                  </div>
                </button>
              </div>

              {deliveryMethod === "delivery" ? (
                <div className="space-y-4 pt-2">
                  <label className="block">
                    <span className="eyebrow text-forest">Delivery zone</span>
                    {zones.length > 0 ? (
                      <select
                        name="zoneId"
                        required
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
                    ) : (
                      <p className="mt-2 rounded-sm border border-clay/65 bg-sand/60 px-3 py-2.5 text-xs text-ink/75">
                        {zonesLoading
                          ? "Loading delivery zones…"
                          : "No active delivery zones available right now — choose Gbagada Studio Pickup or call 0809 661 3114."}
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="eyebrow text-forest">Street address</span>
                    <input
                      required
                      name="address"
                      type="text"
                      autoComplete="street-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House number, street name, nearest landmark"
                      className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="eyebrow text-forest">City / Area</span>
                      <input
                        required
                        name="city"
                        type="text"
                        autoComplete="address-level2"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow text-forest">State</span>
                      <input
                        required
                        name="state"
                        type="text"
                        autoComplete="address-level1"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-clay/65 bg-sand/60 p-4 text-sm text-ink/85">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                    <div className="space-y-1">
                      <p className="font-medium text-forest">
                        Pickup at Ligera Studio (Free)
                      </p>
                      <p>{STUDIO_ADDRESS.formatted}</p>
                      <p className="text-xs text-ink/70">
                        {STUDIO_HOURS_DISPLAY} · {STUDIO_PHONE_DISPLAY}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <label className="block">
                <span className="eyebrow text-forest">Gift / delivery note (optional)</span>
                <textarea
                  name="note"
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional message for the recipient or landmark directions for the rider"
                  className="mt-2 w-full rounded-sm border border-clay/65 bg-card px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink/85">
                <input
                  type="checkbox"
                  name="hidePrices"
                  checked={hidePrices}
                  onChange={(e) => setHidePrices(e.target.checked)}
                  className="h-4 w-4 accent-[var(--gold)]"
                />
                Hide prices on packing slip (sending as a gift)
              </label>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="eyebrow mb-3 text-forest">Payment</legend>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-clay/65 bg-card px-4 py-3 text-sm text-ink">
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    defaultChecked
                    className="accent-[var(--gold)]"
                  />
                  Flutterwave (Card, Bank Transfer, USSD)
                </span>
                <Lock className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
              </label>
            </fieldset>
          </div>

          <aside className="h-fit rounded-sm border border-gold/25 bg-forest p-7 text-forest-foreground shadow-[var(--shadow-soft)] md:sticky md:top-24">
            <p className="eyebrow text-gold">Your order</p>
            <ul className="mt-5 space-y-4">
              {items.map((line) => (
                <li
                  key={getCartLineKey(line)}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-forest-foreground/75">
                    {line.name} × {line.qty}
                  </span>
                  <span className="text-forest-foreground">
                    {naira(line.price * line.qty)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-3 border-t border-forest-foreground/20 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-forest-foreground/75">Subtotal</dt>
                <dd className="text-forest-foreground">{naira(displaySubtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-forest-foreground/75">
                  {deliveryMethod === "pickup" ? "Studio pickup" : "Delivery"}
                </dt>
                <dd
                  className={
                    displayDelivery === 0
                      ? "font-medium text-gold"
                      : "text-forest-foreground"
                  }
                >
                  {displayDelivery === 0 ? "Free" : naira(displayDelivery)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-forest-foreground/20 pt-3 text-base">
                <dt className="text-forest-foreground">Total</dt>
                <dd className="font-medium text-forest-foreground">
                  {naira(displayTotal)}
                </dd>
              </div>
            </dl>

            {typeof quote?.freeDeliveryGap === "number" && quote.freeDeliveryGap > 0 && (
              <p className="mt-3 text-xs text-gold/90">
                Add {naira(quote.freeDeliveryGap)} more for complimentary Lagos delivery.
              </p>
            )}

            {displayWindow && (
              <p className="mt-3 text-xs text-forest-foreground/75">
                Estimated window: {displayWindow}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-sm border border-destructive/40 bg-destructive/15 px-3 py-2 text-xs text-forest-foreground"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={items.length === 0 || busy}
              className="btn-gold mt-7 w-full disabled:opacity-50"
            >
              {busy ? "Redirecting to payment…" : "Proceed to payment"}
            </button>

            <p className="mt-4 text-center text-[11px] text-forest-foreground/75">
              Questions? Call{" "}
              <a
                href="tel:08096613114"
                className="text-gold underline underline-offset-4 hover:text-forest-foreground"
              >
                {STUDIO_PHONE_DISPLAY}
              </a>
            </p>
          </aside>
        </form>
      </section>

      <SiteFooter />
    </div>
  );
}
