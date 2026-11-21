/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "--font-display" }),
  Inter: () => ({ variable: "--font-sans" }),
}));

import { render } from "@testing-library/react";
import RootLayout from "@/app/layout";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import { buildFaqJsonLd, buildProductJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_FAQS } from "@/lib/seo/content-defaults";

describe("SEO, AEO, and Local SEO configuration", () => {
  it("renders a single valid @graph JSON-LD script in RootLayout for ligerascents.com", () => {
    const { container } = render(
      <RootLayout>
        <div>test</div>
      </RootLayout>,
    );
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);

    const rawJson = scripts[0].textContent ?? "";
    expect(rawJson).not.toContain("ligera.ng");
    expect(rawJson).toContain("https://ligerascents.com");

    const parsed = JSON.parse(rawJson);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(Array.isArray(parsed["@graph"])).toBe(true);

    const org = parsed["@graph"].find((item: any) => item["@type"] === "Organization");
    const store = parsed["@graph"].find((item: any) => item["@type"] === "HomeGoodsStore");
    const website = parsed["@graph"].find((item: any) => item["@type"] === "WebSite");

    expect(org).toBeDefined();
    expect(org.url).toBe("https://ligerascents.com");
    expect(store).toBeDefined();
    expect(store.telephone).toBe("+2348096613114");
    expect(store.address).toMatchObject({
      "@type": "PostalAddress",
      streetAddress: "43 Onabola Street, Pedro Road",
      addressLocality: "Gbagada",
      addressRegion: "Lagos",
      addressCountry: "NG",
    });
    expect(store.openingHoursSpecification[0]).toMatchObject({
      opens: "09:00",
      closes: "18:00",
    });
    expect(store.openingHoursSpecification[0].dayOfWeek).toContain("Monday");
    expect(store.openingHoursSpecification[0].dayOfWeek).toContain("Saturday");
    expect(website).toBeDefined();
    expect(website.inLanguage).toBe("en-NG");
  });

  it("configures robots.ts with sitemap on ligerascents.com and disallows utility/admin routes", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://ligerascents.com/sitemap.xml");
    expect(result.host).toBe("https://ligerascents.com");

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const wildcard = rules.find((r) => r.userAgent === "*");
    expect(wildcard).toBeDefined();
    expect(wildcard?.disallow).toEqual(
      expect.arrayContaining(["/admin", "/checkout", "/cart", "/api/"]),
    );

    const aiBots = rules.map((r) => r.userAgent);
    expect(aiBots).toEqual(
      expect.arrayContaining(["OAI-SearchBot", "GPTBot", "PerplexityBot", "ClaudeBot"]),
    );
  });

  it("generates dynamic sitemap URLs on ligerascents.com including categories, info pages, and products", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    for (const url of urls) {
      expect(url.startsWith("https://ligerascents.com")).toBe(true);
      expect(url).not.toContain("ligera.ng");
    }

    expect(urls).toEqual(
      expect.arrayContaining([
        "https://ligerascents.com/",
        "https://ligerascents.com/collections",
        "https://ligerascents.com/collections/scented-candles",
        "https://ligerascents.com/collections/reed-diffusers",
        "https://ligerascents.com/collections/room-linen-sprays",
        "https://ligerascents.com/collections/gypsum-decor",
        "https://ligerascents.com/our-story",
        "https://ligerascents.com/custom-orders",
        "https://ligerascents.com/faqs",
        "https://ligerascents.com/delivery-returns",
        "https://ligerascents.com/visit-us",
        "https://ligerascents.com/products/amber-hush",
      ]),
    );
  });

  it("serves /llms.txt with studio, delivery, pricing, and product URLs", async () => {
    const res = await getLlmsTxt();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const body = await res.text();
    expect(body).toContain("ligerascents.com");
    expect(body).toContain("Gbagada");
    expect(body).toContain("₦");
    expect(body).toContain("https://ligerascents.com/products/amber-hush");
    expect(body).not.toContain("ligera.ng");
  });

  it("builds valid Product JSON-LD with NGN currency and canonical ligerascents.com URL", () => {
    const schema = buildProductJsonLd({
      name: "Amber Hush",
      slug: "amber-hush",
      description: "Amber · Vanilla · Cedar",
      category: "Scented Candles",
      price: 18500,
      imageUrl: "/hero-poster.jpg",
      inStock: true,
    });

    expect(schema["@type"]).toBe("Product");
    expect(schema.url).toBe("https://ligerascents.com/products/amber-hush");
    expect(schema.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "NGN",
      price: 18500,
      availability: "https://schema.org/InStock",
    });
  });

  it("builds valid FAQPage JSON-LD from FAQ entries", () => {
    const schema = buildFaqJsonLd(DEFAULT_FAQS);
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity.length).toBeGreaterThanOrEqual(5);
    expect(schema.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: DEFAULT_FAQS[0].question,
      acceptedAnswer: {
        "@type": "Answer",
        text: DEFAULT_FAQS[0].answer,
      },
    });
  });
});
