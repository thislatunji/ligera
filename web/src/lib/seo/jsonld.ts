import {
  AREA_SERVED,
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  STUDIO_ADDRESS,
  STUDIO_INSTAGRAM_URL,
  STUDIO_MAPS_URL,
  STUDIO_PHONE_E164,
  absoluteUrl,
} from "./site";

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildSiteGraphJsonLd() {
  const orgId = `${SITE_URL}/#organization`;
  const storeId = `${SITE_URL}/#store`;
  const websiteId = `${SITE_URL}/#website`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE_NAME,
        url: SITE_URL,
        slogan: SITE_TAGLINE,
        description: SITE_DESCRIPTION,
        logo: absoluteUrl("/favicon.png"),
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        sameAs: [STUDIO_INSTAGRAM_URL],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: STUDIO_PHONE_E164,
            contactType: "customer service",
            areaServed: "NG",
            availableLanguage: ["en"],
          },
        ],
      },
      {
        "@type": "HomeGoodsStore",
        "@id": storeId,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        logo: absoluteUrl("/favicon.png"),
        telephone: STUDIO_PHONE_E164,
        priceRange: "₦₦",
        currenciesAccepted: "NGN",
        paymentAccepted: "Card, Bank Transfer, Flutterwave",
        address: {
          "@type": "PostalAddress",
          streetAddress: STUDIO_ADDRESS.streetAddress,
          addressLocality: STUDIO_ADDRESS.addressLocality,
          addressRegion: STUDIO_ADDRESS.addressRegion,
          addressCountry: STUDIO_ADDRESS.addressCountry,
        },
        hasMap: STUDIO_MAPS_URL,
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
            opens: "09:00",
            closes: "18:00",
          },
        ],
        sameAs: [STUDIO_INSTAGRAM_URL],
        areaServed: AREA_SERVED.map((area) =>
          area === "Nigeria"
            ? { "@type": "Country", name: area }
            : { "@type": "Place", name: area },
        ),
        parentOrganization: { "@id": orgId },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en-NG",
        publisher: { "@id": orgId },
      },
    ],
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildItemListJsonLd(
  name: string,
  path: string,
  products: {
    name: string;
    slug: string;
    imageUrl?: string | null;
    price: number;
  }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(path),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/products/${product.slug}`),
      name: product.name,
    })),
  };
}

export function buildProductJsonLd(product: {
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  inStock: boolean;
  madeToOrder?: boolean;
}) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const availability = product.madeToOrder
    ? "https://schema.org/PreOrder"
    : product.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: [absoluteUrl(product.imageUrl)],
    category: product.category,
    url,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "NGN",
      price: product.price,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@id": `${SITE_URL}/#store`,
        name: SITE_NAME,
      },
    },
  };
}

export function buildFaqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildBespokeServiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Bespoke Home Fragrance, Wedding Favors & Corporate Gifting",
    serviceType: "Custom Scented Candles, Reed Diffusers, Room Sprays & Gypsum Decor",
    description:
      "Made-to-order scented candles, custom reed diffusers, room & linen sprays, and sculpted gypsum vessels for weddings, corporate gifts, and short-let residences in Lagos and across Nigeria.",
    provider: {
      "@id": `${SITE_URL}/#store`,
      name: SITE_NAME,
    },
    areaServed: AREA_SERVED.map((area) =>
      area === "Nigeria"
        ? { "@type": "Country", name: area }
        : { "@type": "Place", name: area },
    ),
    url: absoluteUrl("/custom-orders"),
  };
}
