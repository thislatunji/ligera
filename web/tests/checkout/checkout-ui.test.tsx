/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockNav = {
  params: { orderNumber: "LG-000001" } as Record<string, string>,
  searchParams: new URLSearchParams(),
};

vi.mock("next/navigation", () => ({
  useParams: () => mockNav.params,
  useSearchParams: () => mockNav.searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return <img src={resolvedSrc} alt={alt} {...props} />;
  },
}));

import CheckoutPage from "@/app/checkout/page";
import OrderConfirmationPage from "@/app/order/[orderNumber]/page";
import { CartProvider } from "@/lib/cart";

const CART_STORAGE_KEY = "ligera-cart-v2";

function seedCart() {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      updatedAt: Date.now(),
      items: [
        {
          id: "prod-1",
          variantId: "var-1",
          name: "Amber Hush",
          notes: "Amber · Vanilla",
          category: "Candles",
          price: 18500,
          imageUrl: null,
          qty: 1,
        },
      ],
    })
  );
}

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>{ui}</CartProvider>
    </QueryClientProvider>
  );
}

describe("Guest checkout & order confirmation UI", () => {
  const originalLocation = window.location;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockNav.params = { orderNumber: "LG-000001" };
    mockNav.searchParams = new URLSearchParams();
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        href: "http://localhost/checkout",
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("renders guest checkout without login, toggles delivery/pickup, preserves cart on submit, and redirects to Flutterwave", async () => {
    seedCart();
    let capturedOrderPayload: any = null;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/delivery-zones")) {
        return new Response(
          JSON.stringify([
            { id: "zone-lekki", name: "Lekki", fee: 3000, etaText: "2–3 working days" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/checkout/quote")) {
        const body = JSON.parse(String(init?.body || "{}"));
        const deliveryFee = body.deliveryMethod === "pickup" ? 0 : 3000;
        return new Response(
          JSON.stringify({
            items: [
              {
                variantId: "var-1",
                productId: "prod-1",
                name: "Amber Hush",
                unitPrice: 18500,
                qty: 1,
                lineTotal: 18500,
                available: 10,
                soldOut: false,
              },
            ],
            subtotal: 18500,
            deliveryFee,
            total: 18500 + deliveryFee,
            expectedDeliveryWindow:
              body.deliveryMethod === "pickup"
                ? "Studio pickup — Ready within 24 hours (Mon–Sat, 9:00 AM – 6:00 PM WAT)"
                : "2–3 working days",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/checkout/orders")) {
        capturedOrderPayload = JSON.parse(String(init?.body || "{}"));
        return new Response(
          JSON.stringify({
            orderNumber: "LG-000042",
            total: 18500,
            paymentUrl: "https://checkout.flutterwave.com/v3/hosted/pay/test-42",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 404 });
    }) as any;

    renderWithProviders(<CheckoutPage />);

    expect(screen.getByText(/Step 1 of 2 — Your details/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Guest checkout/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("₦21,500")).toBeTruthy();
    });

    // Switch to Gbagada Studio Pickup
    fireEvent.click(screen.getByRole("radio", { name: /Gbagada Studio Pickup/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Delivery zone/i)).toBeNull();
      expect(screen.getByText(/Pickup at Ligera Studio \(Free\)/i)).toBeTruthy();
      expect(screen.getByText("Free")).toBeTruthy();
    });

    // Fill contact details
    fireEvent.change(screen.getByLabelText(/Full name/i), {
      target: { value: "Adaeze Okafor" },
    });
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: "adaeze@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Phone number/i), {
      target: { value: "0809 661 3114" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Proceed to payment/i }));

    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://checkout.flutterwave.com/v3/hosted/pay/test-42"
      );
    });

    expect(capturedOrderPayload).toMatchObject({
      deliveryMethod: "pickup",
      contact: {
        name: "Adaeze Okafor",
        email: "adaeze@example.com",
        phone: "08096613114",
      },
      items: [{ variantId: "var-1", qty: 1 }],
    });
    expect(sessionStorage.getItem("ligera_pending_order")).toBe("LG-000042");

    // Cart must remain intact until payment is confirmed on /order/[orderNumber]
    const storedAfterSubmit = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "{}");
    expect(storedAfterSubmit.items).toHaveLength(1);
  });

  it("handles ?status=cancelled on /order/[orderNumber] without clearing cart and offers payment retry", async () => {
    seedCart();
    mockNav.params = { orderNumber: "LG-000001" };
    mockNav.searchParams = new URLSearchParams("status=cancelled");

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/checkout/orders/LG-000001/status")) {
        return new Response(
          JSON.stringify({
            orderNumber: "LG-000001",
            status: "pending_payment",
            paymentStatus: "pending",
            deliveryMethod: "delivery",
            deliveryZoneName: "Lekki",
            items: [{ name: "Amber Hush", qty: 1, unitPrice: 18500 }],
            subtotal: 18500,
            deliveryFee: 3000,
            total: 21500,
            expectedDeliveryWindow: "2–3 working days",
            placedAt: new Date().toISOString(),
            paidAt: null,
            paymentUrl: "https://flutterwave.com/pay/retry-1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 404 });
    }) as any;

    renderWithProviders(<OrderConfirmationPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Payment was cancelled/i })).toBeTruthy();
    });

    const retryLink = screen.getByRole("link", { name: /Try payment again/i });
    expect(retryLink.getAttribute("href")).toBe("https://flutterwave.com/pay/retry-1");
    expect(screen.getByRole("link", { name: /Return to checkout/i }).getAttribute("href")).toBe(
      "/checkout"
    );

    const storedAfterCancel = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "{}");
    expect(storedAfterCancel.items).toHaveLength(1);
  });

  it("actively verifies payment on /order/[orderNumber], renders order summary & window, and clears cart once paid", async () => {
    seedCart();
    sessionStorage.setItem("ligera_pending_order", "LG-000001");
    mockNav.params = { orderNumber: "LG-000001" };
    mockNav.searchParams = new URLSearchParams("status=successful&transaction_id=777888");

    let calledUrl = "";
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calledUrl = String(input);
      if (calledUrl.includes("/api/checkout/orders/LG-000001/verify-status")) {
        return new Response(
          JSON.stringify({
            orderNumber: "LG-000001",
            status: "paid",
            paymentStatus: "successful",
            deliveryMethod: "delivery",
            deliveryZoneName: "Lekki",
            items: [{ name: "Amber Hush", qty: 1, unitPrice: 18500 }],
            subtotal: 18500,
            deliveryFee: 3000,
            total: 21500,
            expectedDeliveryWindow: "2–3 working days",
            placedAt: new Date().toISOString(),
            paidAt: new Date().toISOString(),
            paymentUrl: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 404 });
    }) as any;

    renderWithProviders(<OrderConfirmationPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Thank you — your order is confirmed/i })
      ).toBeTruthy();
    });

    expect(calledUrl).toContain("/api/checkout/orders/LG-000001/verify-status?transaction_id=777888");
    expect(screen.getByText("LG-000001")).toBeTruthy();
    expect(screen.getByText(/Amber Hush × 1/i)).toBeTruthy();
    expect(screen.getByText("₦21,500")).toBeTruthy();
    expect(screen.getByText("2–3 working days")).toBeTruthy();

    await waitFor(() => {
      const storedAfterPaid = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "{}");
      expect(storedAfterPaid.items).toEqual([]);
    });
    expect(sessionStorage.getItem("ligera_pending_order")).toBeNull();
  });
});
