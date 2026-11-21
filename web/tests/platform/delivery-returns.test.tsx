/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return <img src={resolvedSrc} alt={alt} {...props} />;
  },
}));

import DeliveryReturnsPage from "@/app/delivery-returns/page";
import { CartProvider } from "@/lib/cart";
import { DEFAULT_DELIVERY_ZONES } from "@/lib/seo/content-defaults";

describe("DeliveryReturnsPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders delivery zones and timelines without delivery fees", async () => {
    const page = await DeliveryReturnsPage();
    render(<CartProvider>{page}</CartProvider>);

    const table = screen.getByRole("table");
    const tableScope = within(table);

    expect(tableScope.getByRole("columnheader", { name: "Zone" })).toBeDefined();
    expect(
      tableScope.getByRole("columnheader", { name: "Estimated Timeline" }),
    ).toBeDefined();
    expect(
      tableScope.queryByRole("columnheader", { name: /Delivery Fee/i }),
    ).toBeNull();
    expect(screen.queryByText(/Delivery Fee/i)).toBeNull();

    for (const zone of DEFAULT_DELIVERY_ZONES) {
      expect(tableScope.getByText(zone.name)).toBeDefined();
    }

    expect(tableScope.getAllByText("2–3 working days")).toHaveLength(
      DEFAULT_DELIVERY_ZONES.length,
    );
    expect(table.textContent).not.toContain("₦");
  });
});
