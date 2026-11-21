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

import NotFound from "@/app/not-found";
import { CartProvider } from "@/lib/cart";

function renderNotFound() {
  return render(
    <CartProvider>
      <NotFound />
    </CartProvider>,
  );
}

describe("NotFound", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders branded 404 editorial copy with Return home link to / and Browse collections link to /collections", () => {
    renderNotFound();

    expect(screen.getByText(/404/i)).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 1, name: /This scent has drifted away/i }),
    ).toBeDefined();

    const homeLink = screen.getByRole("link", { name: /Return home/i });
    expect(homeLink.getAttribute("href")).toBe("/");

    const collectionsLink = screen.getByRole("link", { name: /Browse collections/i });
    expect(collectionsLink.getAttribute("href")).toBe("/collections");
  });

  it("renders the animated reed diffuser with reeds and rising scent wisps, and stirs scent on click", () => {
    renderNotFound();

    const diffuserButton = screen.getByTestId("reed-diffuser-animation");
    expect(diffuserButton).toBeDefined();

    const reeds = diffuserButton.querySelectorAll('[data-diffuser-part="reed"]');
    expect(reeds.length).toBeGreaterThanOrEqual(4);

    const wisps = diffuserButton.querySelectorAll('[data-diffuser-part="wisp"]');
    expect(wisps.length).toBeGreaterThanOrEqual(2);

    expect(diffuserButton.querySelector('[data-diffuser-part="burst"]')).toBeNull();

    fireEvent.click(diffuserButton);

    expect(diffuserButton.querySelector('[data-diffuser-part="burst"]')).not.toBeNull();
  });
});
