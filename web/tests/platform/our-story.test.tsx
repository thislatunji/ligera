/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => {
    const resolvedSrc = typeof src === "string" ? src : (src?.src ?? "");
    return <img src={resolvedSrc} alt={alt} {...props} />;
  },
}));

import OurStoryPage from "@/app/our-story/page";
import { CartProvider } from "@/lib/cart";
import { DEFAULT_SITE_IMAGES } from "@/lib/site-images";

async function renderOurStory() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const page = await OurStoryPage();

  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>{page}</CartProvider>
    </QueryClientProvider>,
  );
}

describe("OurStoryPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("removes Gbagada, Lagos from the top-left hero eyebrow", async () => {
    await renderOurStory();

    expect(screen.getByText("Our Story", { selector: "p.eyebrow" })).toBeDefined();
    expect(screen.queryByText(/Our Story\s*·\s*Gbagada, Lagos/i)).toBeNull();
  });

  it("uses the Ligera-branded /hero-poster.jpg image in The Gbagada Studio section", async () => {
    expect(DEFAULT_SITE_IMAGES.storyStudio).toBe("/hero-poster.jpg");

    await renderOurStory();

    const studioImg = screen.getByAltText(
      "Ligera ribbed gypsum candle beside a Ligera reed diffuser",
    ) as HTMLImageElement;
    expect(studioImg.getAttribute("src")).toBe("/hero-poster.jpg");
  });

  it("displays the four actual collections in Our Craft with collection links and non-hero images", async () => {
    await renderOurStory();

    const expectedCollections = [
      {
        title: "Scented Candles",
        href: "/collections/scented-candles",
        alt: "Hand-poured Ligera scented candle and wax melts",
      },
      {
        title: "Reed Diffusers",
        href: "/collections/reed-diffusers",
        alt: "Ligera reed diffuser bottle",
      },
      {
        title: "Room and Linen Spray",
        href: "/collections/room-linen-sprays",
        alt: "Ligera room and linen spray bottle",
      },
      {
        title: "Gypsum Decor",
        href: "/collections/gypsum-decor",
        alt: "Handcrafted Ligera gypsum decor tray and vase",
      },
    ];

    for (const item of expectedCollections) {
      expect(screen.getByRole("heading", { level: 3, name: item.title })).toBeDefined();

      const link = screen.getByRole("link", { name: new RegExp(`Explore ${item.title}`, "i") });
      expect(link.getAttribute("href")).toBe(item.href);

      const img = screen.getByAltText(item.alt) as HTMLImageElement;
      const src = img.getAttribute("src") ?? "";
      expect(src).not.toBe("");
      expect(src).not.toContain("hero.jpg");
    }
  });

  it("updates the CTA eyebrow to Explore and places the Visit us map section directly below", async () => {
    await renderOurStory();

    const exploreEyebrow = screen.getByText("Explore", { selector: "p.eyebrow" });
    expect(exploreEyebrow).toBeDefined();
    expect(screen.queryByText(/Visit or Explore/i)).toBeNull();

    const customOrderLink = screen.getByRole("link", { name: "Make a custom order" });
    expect(customOrderLink.getAttribute("href")).toBe("/custom-orders");
    expect(screen.queryByRole("link", { name: /Bespoke & custom orders/i })).toBeNull();

    const visitHeading = screen.getByRole("heading", { level: 2, name: "Visit us" });
    expect(visitHeading).toBeDefined();
    expect(
      exploreEyebrow.compareDocumentPosition(visitHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(
      screen.getByText(/43 Onabola Street, Pedro Road, Gbagada, Lagos\s*·\s*Call or WhatsApp/i),
    ).toBeDefined();
    const phoneLink = screen.getAllByRole("link", { name: "0809 661 3114" })[0];
    expect(phoneLink.getAttribute("href")).toBe("tel:08096613114");

    const externalMapsLink = screen.getByRole("link", { name: /Open in Google Maps/i });
    expect(externalMapsLink.getAttribute("target")).toBe("_blank");
    expect(externalMapsLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(externalMapsLink.getAttribute("href")).toContain(
      "43+Onabola+Street%2C+Pedro+Road%2C+Gbagada%2C+Lagos",
    );

    const mapIframe = screen.getByTitle(
      "Ligera Studio — 43 Onabola Street, Pedro Road, Gbagada, Lagos",
    ) as HTMLIFrameElement;
    expect(mapIframe.tagName).toBe("IFRAME");
    expect(mapIframe.getAttribute("id")).toBe("ligera-studio-google-map");
    expect(mapIframe.getAttribute("name")).toBe("ligera-studio-google-map");
    const iframeSrc = mapIframe.getAttribute("src") ?? "";
    expect(iframeSrc.startsWith("https://www.google.com/maps/embed")).toBe(true);
    expect(iframeSrc).toContain("43+Onabola+Street,+Pedro+Road,+Gbagada,+Lagos");
  });

  it("renders the real @ligera.est26 Instagram handle in the footer Visit the studio section", async () => {
    await renderOurStory();

    const igLinks = screen.getAllByRole("link", { name: "@ligera.est26" });
    expect(igLinks.length).toBeGreaterThan(0);
    for (const link of igLinks) {
      expect(link.getAttribute("href")).toBe("https://www.instagram.com/ligera.est26/");
    }
    expect(screen.queryByText(/@_ligera_/i)).toBeNull();
  });
});
