"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { naira } from "@/lib/products";
import {
  getOrderPaymentStatus,
  verifyOrderPaymentStatus,
  type PublicOrderPaymentStatus,
} from "@/lib/api";
import {
  STUDIO_ADDRESS,
  STUDIO_HOURS_DISPLAY,
  STUDIO_PHONE_DISPLAY,
} from "@/lib/seo/site";

type CallbackStatus =
  | "loading"
  | "paid"
  | "cancelled"
  | "failed"
  | "mismatch"
  | "timeout"
  | "not_found";

const POST_PAID_STATUSES = new Set([
  "paid",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
]);

const MAX_ATTEMPTS = 20;
const POLL_DELAY_MS = 3000;
const VERIFY_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10000;

function OrderConfirmationContent() {
  const params = useParams<{ orderNumber?: string }>();
  const searchParams = useSearchParams();
  const { clear } = useCart();

  const clearRef = useRef(clear);
  clearRef.current = clear;
  const clearedCartRef = useRef(false);

  const paramOrderNumber = Array.isArray(params?.orderNumber)
    ? params.orderNumber[0]
    : params?.orderNumber;

  const [resolvedOrderNumber, setResolvedOrderNumber] = useState<string>(
    () => (paramOrderNumber || "").trim()
  );
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [orderData, setOrderData] = useState<PublicOrderPaymentStatus | null>(
    null
  );
  const [pollAttempt, setPollAttempt] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

  const paramStatus = searchParams.get("status")?.toLowerCase() ?? "";
  const transactionId = searchParams.get("transaction_id");

  useEffect(() => {
    let targetOrder = (paramOrderNumber || "").trim();
    if (!targetOrder) {
      try {
        targetOrder = (
          sessionStorage.getItem("ligera_pending_order") || ""
        ).trim();
      } catch {
        targetOrder = "";
      }
    }

    if (!targetOrder) {
      setStatus("not_found");
      return;
    }

    setResolvedOrderNumber(targetOrder);
    try {
      sessionStorage.setItem("ligera_pending_order", targetOrder);
    } catch {
      // ignore storage errors
    }

    let isDisposed = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activeController: AbortController | undefined;

    const markPaid = (data: PublicOrderPaymentStatus) => {
      setOrderData(data);
      setStatus("paid");
      try {
        sessionStorage.removeItem("ligera_pending_order");
      } catch {
        // ignore storage errors
      }
      if (!clearedCartRef.current) {
        clearedCartRef.current = true;
        clearRef.current();
      }
    };

    if (paramStatus === "cancelled") {
      (async () => {
        try {
          activeController = new AbortController();
          const res = await getOrderPaymentStatus(
            targetOrder,
            activeController.signal
          );
          if (isDisposed) return;
          if (res.status === 404) {
            setStatus("not_found");
            return;
          }
          if (res.data && POST_PAID_STATUSES.has(res.data.status)) {
            markPaid(res.data);
            return;
          }
          if (res.data) {
            setOrderData(res.data);
          }
          setStatus("cancelled");
        } catch {
          if (!isDisposed) setStatus("cancelled");
        }
      })();
      return () => {
        isDisposed = true;
        activeController?.abort();
      };
    }

    async function checkStatus() {
      if (isDisposed) return;
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );

      try {
        const useVerify = attempts < VERIFY_ATTEMPTS;
        const res = useVerify
          ? await verifyOrderPaymentStatus(
              targetOrder,
              transactionId,
              controller.signal
            )
          : await getOrderPaymentStatus(targetOrder, controller.signal);

        if (isDisposed) return;

        if (res.status === 429) {
          timer = setTimeout(checkStatus, 10000);
          return;
        }

        if (res.status === 404) {
          setStatus("not_found");
          return;
        }

        const data = res.data;
        if (data) {
          setOrderData(data);

          if (POST_PAID_STATUSES.has(data.status)) {
            markPaid(data);
            return;
          }

          if (
            data.paymentStatus === "amount_mismatch" ||
            data.paymentStatus === "underpaid"
          ) {
            setStatus("mismatch");
            return;
          }

          if (
            data.paymentStatus === "failed" ||
            data.status === "abandoned" ||
            data.status === "cancelled"
          ) {
            setStatus("failed");
            return;
          }
        }

        if (attempts < MAX_ATTEMPTS) {
          attempts += 1;
          setPollAttempt(attempts);
          timer = setTimeout(checkStatus, POLL_DELAY_MS);
          return;
        }

        setStatus("timeout");
      } catch {
        if (isDisposed) return;
        if (attempts < MAX_ATTEMPTS) {
          attempts += 1;
          setPollAttempt(attempts);
          timer = setTimeout(checkStatus, POLL_DELAY_MS);
        } else {
          setStatus("timeout");
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    setStatus("loading");
    setPollAttempt(0);
    checkStatus();

    return () => {
      isDisposed = true;
      if (timer) clearTimeout(timer);
      activeController?.abort();
    };
  }, [paramOrderNumber, paramStatus, transactionId, retryNonce]);

  return (
    <section className="mx-auto max-w-2xl px-5 pt-12 pb-24">
      <p className="eyebrow text-center text-forest">
        Step 2 of 2 — Confirmation
      </p>

      {status === "loading" && (
        <div className="mt-6 rounded-sm border border-clay/60 border-t-4 border-t-gold bg-card p-10 text-center shadow-[var(--shadow-soft)]">
          <Loader2
            className="mx-auto h-10 w-10 animate-spin text-gold"
            strokeWidth={1.5}
          />
          <h1 className="mt-6 text-4xl text-forest">Confirming your payment…</h1>
          {resolvedOrderNumber && (
            <p className="mt-3 text-xs tracking-[0.18em] text-ink/70 uppercase">
              Order {resolvedOrderNumber}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ink/75">
            {pollAttempt < 4
              ? "This may take a few seconds."
              : "Waiting for payment confirmation from your bank. Please don't close this page."}
          </p>
        </div>
      )}

      {status === "paid" && orderData && (
        <div className="mt-6 rounded-sm border border-clay/60 border-t-4 border-t-forest bg-card p-8 shadow-[var(--shadow-soft)] sm:p-10">
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold text-accent-foreground">
              <Check className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h1 className="mt-6 text-4xl text-forest">
              Thank you — your order is confirmed
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              Order reference{" "}
              <span className="font-medium text-forest">
                {orderData.orderNumber}
              </span>
              . We&apos;ve sent a confirmation receipt to your email.
            </p>
          </div>

          <div className="mt-8 rounded-sm border border-clay/55 bg-sand/50 p-5 text-sm">
            <p className="eyebrow text-forest">Order summary</p>
            <ul className="mt-4 space-y-2.5">
              {orderData.items.map((item, idx) => (
                <li
                  key={`${item.name}-${idx}`}
                  className="flex justify-between gap-4 text-ink/85"
                >
                  <span>
                    {item.name} × {item.qty}
                  </span>
                  <span className="font-medium text-forest">
                    {naira(item.unitPrice * item.qty)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-clay/55 pt-4">
              <div className="flex justify-between text-ink/75">
                <dt>Subtotal</dt>
                <dd>{naira(orderData.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink/75">
                <dt>
                  {orderData.deliveryMethod === "pickup"
                    ? "Gbagada Studio Pickup"
                    : orderData.deliveryZoneName
                      ? `Delivery (${orderData.deliveryZoneName})`
                      : "Delivery"}
                </dt>
                <dd>
                  {orderData.deliveryFee === 0
                    ? "Free — Gbagada Studio Pickup"
                    : naira(orderData.deliveryFee)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-clay/55 pt-3 text-base font-medium text-forest">
                <dt>Total paid</dt>
                <dd>{naira(orderData.total)}</dd>
              </div>
            </dl>
          </div>

          {orderData.expectedDeliveryWindow && (
            <div className="mt-5 flex items-start gap-3 rounded-sm border border-clay/55 bg-card p-4 text-sm text-ink/85">
              <Clock
                className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                strokeWidth={1.5}
              />
              <div>
                <p className="font-medium text-forest">
                  {orderData.deliveryMethod === "pickup"
                    ? "Pickup window"
                    : "Expected delivery window"}
                </p>
                <p className="mt-0.5 text-xs text-ink/75">
                  {orderData.expectedDeliveryWindow}
                </p>
              </div>
            </div>
          )}

          {orderData.deliveryMethod === "pickup" && (
            <div className="mt-4 flex items-start gap-3 rounded-sm border border-clay/55 bg-card p-4 text-sm text-ink/85">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                strokeWidth={1.5}
              />
              <div>
                <p className="font-medium text-forest">Studio pickup location</p>
                <p className="mt-0.5 text-xs text-ink/75">
                  {STUDIO_ADDRESS.formatted} · {STUDIO_HOURS_DISPLAY} ·{" "}
                  {STUDIO_PHONE_DISPLAY}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/collections" className="btn-gold">
              Continue browsing
            </Link>
            <Link href="/" className="btn-outline-soft">
              Return home
            </Link>
          </div>
        </div>
      )}

      {(status === "cancelled" || status === "failed") && (
        <div className="mt-6 rounded-sm border border-clay/60 border-t-4 border-t-destructive bg-card p-10 text-center shadow-[var(--shadow-soft)]">
          <AlertCircle
            className="mx-auto h-10 w-10 text-destructive"
            strokeWidth={1.5}
          />
          <h1 className="mt-6 text-4xl text-forest">
            {status === "cancelled"
              ? "Payment was cancelled"
              : "Payment did not complete"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/80">
            Your bag is still saved so nothing was lost. You can retry payment
            now or return to checkout to update your details.
          </p>
          {resolvedOrderNumber && (
            <p className="mt-2 text-xs text-ink/65">
              Reference: {resolvedOrderNumber}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {orderData?.paymentUrl && (
              <a href={orderData.paymentUrl} className="btn-gold">
                Try payment again
              </a>
            )}
            <Link href="/checkout" className="btn-outline-soft">
              Return to checkout
            </Link>
          </div>
          <p className="mt-6 text-xs text-ink/70">
            Need help? Call or WhatsApp{" "}
            <a
              href="tel:08096613114"
              className="text-forest underline underline-offset-4"
            >
              {STUDIO_PHONE_DISPLAY}
            </a>
            .
          </p>
        </div>
      )}

      {status === "mismatch" && (
        <div className="mt-6 rounded-sm border border-clay/60 border-t-4 border-t-gold bg-card p-10 text-center shadow-[var(--shadow-soft)]">
          <AlertCircle
            className="mx-auto h-10 w-10 text-gold"
            strokeWidth={1.5}
          />
          <h1 className="mt-6 text-4xl text-forest">Payment needs review</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/80">
            We detected a discrepancy with the payment amount for order{" "}
            <span className="font-medium text-forest">
              {resolvedOrderNumber}
            </span>
            . Our studio team has been alerted and will verify it right away.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="tel:08096613114" className="btn-gold">
              Call {STUDIO_PHONE_DISPLAY}
            </a>
            <Link href="/collections" className="btn-outline-soft">
              Continue browsing
            </Link>
          </div>
        </div>
      )}

      {status === "timeout" && (
        <div className="mt-6 rounded-sm border border-clay/60 border-t-4 border-t-gold bg-card p-10 text-center shadow-[var(--shadow-soft)]">
          <Clock
            className="mx-auto h-10 w-10 text-gold"
            strokeWidth={1.5}
          />
          <h1 className="mt-6 text-4xl text-forest">
            Payment is still processing
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/80">
            We&apos;ll send your confirmation email for{" "}
            <span className="font-medium text-forest">
              {resolvedOrderNumber}
            </span>{" "}
            as soon as Flutterwave confirms your transfer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setPollAttempt(0);
                setRetryNonce((n) => n + 1);
              }}
              className="btn-gold"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Check status again
            </button>
            <Link href="/collections" className="btn-outline-soft">
              Continue browsing
            </Link>
          </div>
          <p className="mt-6 text-xs text-ink/70">
            Questions? Call or WhatsApp{" "}
            <a
              href="tel:08096613114"
              className="text-forest underline underline-offset-4"
            >
              {STUDIO_PHONE_DISPLAY}
            </a>
            .
          </p>
        </div>
      )}

      {status === "not_found" && (
        <div className="mt-6 rounded-sm border border-clay/60 border-t-4 border-t-clay bg-card p-10 text-center shadow-[var(--shadow-soft)]">
          <h1 className="text-4xl text-forest">Order not found</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/80">
            We couldn&apos;t find a matching order reference. If you haven&apos;t
            completed your purchase yet, you can return to checkout or continue
            browsing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/checkout" className="btn-gold">
              Go to checkout
            </Link>
            <Link href="/collections" className="btn-outline-soft">
              Browse collections
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

export default function OrderConfirmationPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Suspense
        fallback={
          <section className="mx-auto max-w-2xl px-5 pt-12 pb-24 text-center">
            <p className="eyebrow text-forest">Step 2 of 2 — Confirmation</p>
            <div className="mt-6 rounded-sm border border-clay/60 bg-card p-10 shadow-[var(--shadow-soft)]">
              <Loader2
                className="mx-auto h-10 w-10 animate-spin text-gold"
                strokeWidth={1.5}
              />
              <h1 className="mt-6 text-4xl text-forest">
                Loading order status…
              </h1>
            </div>
          </section>
        }
      >
        <OrderConfirmationContent />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
