/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    const resolvedSrc = typeof src === "string" ? src : src?.src ?? "";
    return <img src={resolvedSrc} alt={alt} {...props} />;
  },
}));

import CustomOrdersPage from "@/app/custom-orders/page";
import { CustomOrderForm } from "@/components/CustomOrderForm";
import { CartProvider } from "@/lib/cart";
import {
  CUSTOM_ORDER_CATEGORIES,
  LIGERA_WHATSAPP_NUMBER,
  buildCustomOrderWhatsAppMessage,
  buildCustomOrderWhatsAppUrl,
} from "@/lib/custom-orders";

describe("custom-orders helpers", () => {
  it("formats and trims the WhatsApp message and encodes special characters in URL", () => {
    const msg = buildCustomOrderWhatsAppMessage(
      "  Candles  ",
      "  20 amber jars & gold lids? #wedding  ",
    );
    expect(msg).toBe(
      [
        "Hello Ligera, I would like to place a custom order.",
        "",
        "Product: Candles",
        "Details: 20 amber jars & gold lids? #wedding",
      ].join("\n"),
    );

    const url = buildCustomOrderWhatsAppUrl(
      "  Candles  ",
      "  20 amber jars & gold lids? #wedding  ",
    );
    expect(url).toBe(
      `https://wa.me/${LIGERA_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
    );
    expect(url).toContain("%0A");
    expect(url).toContain("%26");
    expect(url).toContain("%3F");
    expect(url).toContain("%23");
  });
});

describe("CustomOrderForm", () => {
  const createOpenSpy = () => vi.spyOn(window, "open").mockImplementation(() => null);
  let openSpy: ReturnType<typeof createOpenSpy>;

  beforeEach(() => {
    window.history.replaceState({}, "", "/custom-orders");
    openSpy = createOpenSpy();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("renders the product dropdown with all 5 categories, details textarea, and Make Custom Order button", () => {
    render(<CustomOrderForm />);

    const select = screen.getByLabelText(/product/i) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");

    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual([
      "",
      "Candles",
      "Diffusers",
      "Room Sprays",
      "Gypsum Decor",
      "Curated Bundle",
    ]);

    const textarea = screen.getByLabelText(/further details/i) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");

    const submitBtn = screen.getByRole("button", { name: /^Make Custom Order$/i });
    expect(submitBtn).toBeDefined();
    expect(screen.queryByText(/Continues on WhatsApp/i)).toBeNull();
    expect(
      screen.getByText(/chat with our studio on WhatsApp for pricing and delivery time\./i),
    ).toBeDefined();
  });

  it("validates empty form and whitespace-only details without calling window.open", () => {
    render(<CustomOrderForm />);

    const submitBtn = screen.getByRole("button", { name: /^Make Custom Order$/i });
    fireEvent.click(submitBtn);

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(screen.getByText(/Please select a product to custom order\./i)).toBeDefined();
    expect(screen.getByText(/Please provide details for your custom order\./i)).toBeDefined();
    expect(openSpy).not.toHaveBeenCalled();

    const select = screen.getByLabelText(/product/i);
    const textarea = screen.getByLabelText(/further details/i);
    fireEvent.change(select, { target: { value: "Candles" } });
    fireEvent.change(textarea, { target: { value: "   \n  " } });
    fireEvent.click(submitBtn);

    expect(screen.queryByText(/Please select a product to custom order\./i)).toBeNull();
    expect(screen.getByText(/Please provide details for your custom order\./i)).toBeDefined();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("updates preview on selection, launches WhatsApp on submit, clears stale link on edit, and resets form", () => {
    render(<CustomOrderForm />);

    const select = screen.getByLabelText(/product/i) as HTMLSelectElement;
    const textarea = screen.getByLabelText(/further details/i) as HTMLTextAreaElement;
    const submitBtn = screen.getByRole("button", { name: /^Make Custom Order$/i });

    expect(screen.getByText("Bespoke studio")).toBeDefined();
    expect(screen.getByText(/Made to order in Lagos/i)).toBeDefined();

    fireEvent.change(select, { target: { value: "Candles" } });

    const candlesOption = CUSTOM_ORDER_CATEGORIES.find((c) => c.value === "Candles")!;
    expect(screen.queryByText(/Selected family/i)).toBeNull();
    expect(screen.queryByText("Bespoke studio")).toBeNull();
    expect(screen.getByRole("heading", { name: "Candles" })).toBeDefined();
    expect(screen.getByText(candlesOption.description)).toBeDefined();

    const detailsText = "30 Amber Hush candles with custom gold wedding labels";
    fireEvent.change(textarea, { target: { value: detailsText } });
    fireEvent.click(submitBtn);

    const expectedUrl = buildCustomOrderWhatsAppUrl("Candles", detailsText);
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(expectedUrl, "_blank", "noopener,noreferrer");

    const fallbackLink = screen.getByRole("link", { name: /Open WhatsApp again/i });
    expect(fallbackLink.getAttribute("href")).toBe(expectedUrl);
    expect(fallbackLink.getAttribute("target")).toBe("_blank");
    expect(fallbackLink.getAttribute("rel")).toBe("noopener noreferrer");

    // Editing details clears the stale fallback link
    fireEvent.change(textarea, { target: { value: `${detailsText}, delivery Dec 12` } });
    expect(screen.queryByRole("link", { name: /Open WhatsApp again/i })).toBeNull();

    // Resubmit then clear form
    fireEvent.click(submitBtn);
    expect(screen.getByRole("link", { name: /Open WhatsApp again/i })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Clear form/i }));
    expect(select.value).toBe("");
    expect(textarea.value).toBe("");
    expect(screen.queryByRole("link", { name: /Open WhatsApp again/i })).toBeNull();
  });

  it("preselects product category from ?product= query parameter", () => {
    window.history.replaceState({}, "", "/custom-orders?product=Diffusers");
    render(<CustomOrderForm />);

    const select = screen.getByLabelText(/product/i) as HTMLSelectElement;
    expect(select.value).toBe("Diffusers");
    expect(screen.getByRole("heading", { name: "Diffusers" })).toBeDefined();
  });
});

describe("CustomOrdersPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the page heading, navigation, form controls, and footer", () => {
    render(
      <CartProvider>
        <CustomOrdersPage />
      </CartProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Crafted for");
    expect(screen.getByText("Bespoke & Custom Orders")).toBeDefined();
    expect(screen.queryByText(/Bespoke & Custom Orders · Gbagada, Lagos/i)).toBeNull();
    expect(screen.getByRole("navigation", { name: /Main navigation/i })).toBeDefined();
    expect(screen.getByLabelText(/^product$/i)).toBeDefined();
    expect(screen.getByLabelText(/further details/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /^Make Custom Order$/i })).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getAllByText(/Visit the studio/i).length).toBeGreaterThan(0);
  });
});
