/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return <img src={resolvedSrc} alt={alt} {...props} />;
  },
}));

import { SiteHeader } from "@/components/SiteHeader";
import { CartProvider } from "@/lib/cart";

describe("SiteHeader mobile menu", () => {
  afterEach(() => {
    cleanup();
  });

  it("excludes Visit and Your Bag from mobile nav and links Gbagada Studio address to Google Maps and phone to tel", () => {
    render(
      <CartProvider>
        <SiteHeader />
      </CartProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Open menu/i }));

    const mobileNav = screen.getByRole("navigation", { name: /Mobile navigation/i });
    const navLabels = within(mobileNav)
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());

    expect(navLabels).toEqual(["Home", "Collections", "Our Story", "Custom Orders", "Reviews"]);
    expect(within(mobileNav).queryByText(/Visit/i)).toBeNull();
    expect(within(mobileNav).queryByText(/Your Bag/i)).toBeNull();

    const studioLink = screen.getByRole("link", {
      name: /Gbagada Studio.*43 Onabola Street, Pedro Road, Gbagada, Lagos/i,
    });
    expect(studioLink.getAttribute("href")).toBe(
      "https://www.google.com/maps/search/?api=1&query=43+Onabola+Street%2C+Pedro+Road%2C+Gbagada%2C+Lagos",
    );
    expect(studioLink.getAttribute("target")).toBe("_blank");
    expect(studioLink.getAttribute("rel")).toBe("noopener noreferrer");

    const phoneLink = screen.getByRole("link", { name: "0809 661 3114" });
    expect(phoneLink.getAttribute("href")).toBe("tel:08096613114");
  });

  it("places hamburger menu on the left, logo in the center, and bag on the right on mobile", () => {
    const { container } = render(
      <CartProvider>
        <SiteHeader />
      </CartProvider>,
    );

    const headerBar = container.querySelector("header > div") as HTMLElement;
    expect(headerBar).not.toBeNull();
    const barClasses = headerBar.className.split(/\s+/);
    expect(barClasses).toEqual(
      expect.arrayContaining(["grid", "grid-cols-[1fr_auto_1fr]", "md:flex", "md:justify-between"]),
    );

    const menuButton = screen.getByRole("button", { name: /Open menu/i });
    const logoLink = screen.getByRole("link", { name: "Ligera home" });
    const cartLink = screen.getByRole("link", { name: "View cart" });

    expect(
      menuButton.compareDocumentPosition(logoLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      logoLink.compareDocumentPosition(cartLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const menuWrapperClasses = menuButton.parentElement!.className.split(/\s+/);
    expect(menuWrapperClasses).toEqual(expect.arrayContaining(["justify-start", "md:hidden"]));

    expect(logoLink.className.split(/\s+/)).toContain("justify-self-center");

    const cartWrapperClasses = cartLink.parentElement!.className.split(/\s+/);
    expect(cartWrapperClasses).toContain("justify-end");
  });
});
