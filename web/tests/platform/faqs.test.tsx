/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return <img src={resolvedSrc} alt={alt} {...props} />;
  },
}));

import CustomOrdersPage from "@/app/custom-orders/page";
import FaqsPage from "@/app/faqs/page";
import { FaqAccordion } from "@/components/FaqAccordion";
import { CartProvider } from "@/lib/cart";
import { DEFAULT_CUSTOM_ORDER_FAQS, DEFAULT_FAQS } from "@/lib/seo/content-defaults";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFaqButton(question: string): HTMLButtonElement {
  return screen.getByRole("button", {
    name: new RegExp(escapeRegExp(question)),
  }) as HTMLButtonElement;
}

describe("FaqAccordion", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders collapsed FAQ triggers by default and toggles answers on click", () => {
    const sampleItems = DEFAULT_FAQS.slice(0, 3);
    render(<FaqAccordion items={sampleItems} />);

    for (const item of sampleItems) {
      const trigger = getFaqButton(item.question);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByText(item.answer)).toBeNull();
    }

    const firstTrigger = getFaqButton(sampleItems[0].question);
    const secondTrigger = getFaqButton(sampleItems[1].question);

    // Clicking first trigger expands it and reveals its answer
    fireEvent.click(firstTrigger);
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(sampleItems[0].answer)).toBeDefined();

    // Clicking second trigger expands it and collapses the first (single collapsible mode)
    fireEvent.click(secondTrigger);
    expect(secondTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText(sampleItems[1].answer)).toBeDefined();
    expect(screen.queryByText(sampleItems[0].answer)).toBeNull();

    // Clicking the currently open trigger collapses it back
    fireEvent.click(secondTrigger);
    expect(secondTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(sampleItems[1].answer)).toBeNull();
  });
});

describe("FaqsPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders heading, FAQPage JSON-LD, and interactive accordion triggers for DEFAULT_FAQS", async () => {
    const page = await FaqsPage();
    const { container } = render(<CartProvider>{page}</CartProvider>);

    expect(
      screen.getByRole("heading", { level: 1, name: "Frequently asked questions" }),
    ).toBeDefined();

    const jsonLdScripts = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    );
    const parsedScripts = jsonLdScripts.map((el) => JSON.parse(el.textContent ?? "{}"));
    const faqSchema = parsedScripts.find((doc) => doc["@type"] === "FAQPage");
    expect(faqSchema).toBeDefined();
    expect(faqSchema.mainEntity).toHaveLength(DEFAULT_FAQS.length);

    for (const item of DEFAULT_FAQS) {
      const trigger = getFaqButton(item.question);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    }

    const firstFaq = DEFAULT_FAQS[0];
    const firstTrigger = getFaqButton(firstFaq.question);
    expect(screen.queryByText(firstFaq.answer)).toBeNull();

    fireEvent.click(firstTrigger);
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(firstFaq.answer)).toBeDefined();
  });
});

describe("CustomOrdersPage FAQs", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders DEFAULT_CUSTOM_ORDER_FAQS as accordion triggers that expand and collapse", () => {
    render(
      <CartProvider>
        <CustomOrdersPage />
      </CartProvider>,
    );

    for (const item of DEFAULT_CUSTOM_ORDER_FAQS) {
      const trigger = getFaqButton(item.question);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByText(item.answer)).toBeNull();
    }

    const firstFaq = DEFAULT_CUSTOM_ORDER_FAQS[0];
    const firstTrigger = getFaqButton(firstFaq.question);
    fireEvent.click(firstTrigger);
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(firstFaq.answer)).toBeDefined();

    fireEvent.click(firstTrigger);
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(firstFaq.answer)).toBeNull();
  });
});
