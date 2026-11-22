/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "--font-display" }),
  Inter: () => ({ variable: "--font-sans" }),
}));

import { render } from "@testing-library/react";
import RootLayout, { metadata as rootMetadata } from "@/app/layout";
import { metadata as homeMetadata } from "@/app/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import { GET as getLlmsFullTxt } from "@/app/llms-full.txt/route";
import { buildCloudinaryImageUrl } from "@/lib/cloudinary/url";
import { buildFaqJsonLd, buildProductJsonLd } from "@/lib/seo/jsonld";
import { DEFAULT_FAQS } from "@/lib/seo/content-defaults";

describe("SEO, AEO, and Local SEO configuration", () => {
  it("does not leak canonical '/' in RootLayout metadata and configures clean Home metadata", () => {
    expect(rootMetadata.alternates).toBeUndefined();
    expect(homeMetadata.title).toEqual({
      absolute: "Ligera — Scented Candles, Reed Diffusers & Gypsum Decor",
    });
    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(homeMetadata.alternates?.types?.["text/plain"]).toBe(
      "https://ligerascents.com/llms.txt",
    );
    expect(homeMetadata.openGraph).toMatchObject({
      siteName: "Ligera",
      locale: "en_NG",
      images: [
        expect.objectContaining({
          url: "/opengraph-image",
        }),
      ],
    });
    expect(homeMetadata.twitter).toMatchObject({
      card: "summary_large_image",
    });
  });

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
    expect(org.email).toBe("orders@ligerascents.com");
    expect(org.logo).toMatchObject({
      "@type": "ImageObject",
      url: "https://ligerascents.com/logo.png",
      width: 512,
      height: 512,
    });
    expect(store).toBeDefined();
    expect(store.email).toBe("orders@ligerascents.com");
    expect(store.logo).toMatchObject({
      "@type": "ImageObject",
      url: "https://ligerascents.com/logo.png",
      width: 512,
      height: 512,
    });
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

  it("serves /llms.txt and /llms-full.txt with studio, delivery, pricing, FAQs, and product URLs", async () => {
    const res = await getLlmsTxt();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const body = await res.text();
    expect(body).toContain("ligerascents.com");
    expect(body).toContain("orders@ligerascents.com");
    expect(body).toContain("Gbagada");
    expect(body).toContain("₦");
    expect(body).toContain("In stock");
    expect(body).toContain("https://ligerascents.com/products/amber-hush");
    expect(body).toContain("https://ligerascents.com/llms-full.txt");
    expect(body).not.toContain("ligera.ng");

    const fullRes = await getLlmsFullTxt();
    expect(fullRes.status).toBe(200);
    expect(fullRes.headers.get("Content-Type")).toContain("text/plain");

    const fullBody = await fullRes.text();
    expect(fullBody).toContain("Frequently Asked Questions");
    expect(fullBody).toContain("Top Notes:");
    expect(fullBody).toContain("Candle Safety, Diffuser, Spray & Gypsum Care Guide");
    expect(fullBody).toContain("orders@ligerascents.com");
    expect(fullBody).not.toContain("ligera.ng");
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
      shippingDetails: expect.objectContaining({
        "@type": "OfferShippingDetails",
      }),
      hasMerchantReturnPolicy: expect.objectContaining({
        "@type": "MerchantReturnPolicy",
        applicableCountry: "NG",
      }),
    });
  });

  it("builds AggregateOffer Product JSON-LD with SKU, variants, and additionalProperty", () => {
    const schema = buildProductJsonLd({
      name: "Amber Hush",
      slug: "amber-hush",
      description: "Warm amber and vanilla scented candle",
      category: "Scented Candles",
      price: 18500,
      imageUrl: "/hero-poster.jpg",
      images: ["/hero-poster.jpg", "/p-candle.jpg"],
      sku: "AMB-200G",
      inStock: true,
      variants: [
        {
          label: "200g Jar",
          sku: "AMB-200G",
          price: 18500,
          salePrice: null,
          available: 10,
          soldOut: false,
        },
        {
          label: "400g Double Wick",
          sku: "AMB-400G",
          price: 32000,
          salePrice: 29500,
          available: 4,
          soldOut: false,
        },
      ],
      additionalProperty: [
        { name: "Top Scent Notes", value: "Warm Amber" },
        { name: "Burn Time", value: "45 hours" },
      ],
    });

    expect(schema.sku).toBe("AMB-200G");
    expect(schema.image).toHaveLength(2);
    expect(schema.offers).toMatchObject({
      "@type": "AggregateOffer",
      priceCurrency: "NGN",
      lowPrice: 18500,
      highPrice: 29500,
      offerCount: 2,
      availability: "https://schema.org/InStock",
    });
    expect((schema.offers as any).offers).toHaveLength(2);
    expect((schema as any).additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "Top Scent Notes", value: "Warm Amber" },
      { "@type": "PropertyValue", name: "Burn Time", value: "45 hours" },
    ]);
  });

  it("resolves Cloudinary URLs via CLOUDINARY_CLOUD_NAME without hardcoding demo", () => {
    const prevCloud = process.env.CLOUDINARY_CLOUD_NAME;
    const prevPublicCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    try {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      expect(buildCloudinaryImageUrl("candles/amber-hush", 400)).toBe("");
      expect(buildCloudinaryImageUrl("/hero-poster.jpg", 400)).toBe("/hero-poster.jpg");
      expect(
        buildCloudinaryImageUrl("https://cdn.example.com/candle.png", 400),
      ).toBe("https://cdn.example.com/candle.png");

      process.env.CLOUDINARY_CLOUD_NAME = "ligera-studio";
      const resolved = buildCloudinaryImageUrl("candles/amber-hush", 800);
      expect(resolved).toBe(
        "https://res.cloudinary.com/ligera-studio/image/upload/f_auto,q_auto,w_800/candles/amber-hush.jpg",
      );
      expect(resolved).not.toContain("/demo/");
    } finally {
      if (prevCloud === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
      else process.env.CLOUDINARY_CLOUD_NAME = prevCloud;
      if (prevPublicCloud === undefined) {
        delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      } else {
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = prevPublicCloud;
      }
    }
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
