import {
  AREA_SERVED,
  SITE_DESCRIPTION,
  SITE_EMAIL,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  STUDIO_ADDRESS,
  STUDIO_HERO_IMAGE,
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
  const logoObject = {
    "@type": "ImageObject",
    url: absoluteUrl(SITE_LOGO_PATH),
    width: 512,
    height: 512,
  };
  const storeImage = absoluteUrl(STUDIO_HERO_IMAGE);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE_NAME,
        url: SITE_URL,
        email: SITE_EMAIL,
        slogan: SITE_TAGLINE,
        description: SITE_DESCRIPTION,
        logo: logoObject,
        image: storeImage,
        sameAs: [STUDIO_INSTAGRAM_URL],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: STUDIO_PHONE_E164,
            email: SITE_EMAIL,
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
        email: SITE_EMAIL,
        description: SITE_DESCRIPTION,
        image: storeImage,
        logo: logoObject,
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
  images?: string[];
  sku?: string;
  inStock: boolean;
  madeToOrder?: boolean;
  variants?: {
    label: string;
    sku?: string;
    price: number;
    salePrice: number | null;
    available: number;
    soldOut: boolean;
  }[];
  additionalProperty?: { name: string; value: string }[];
}) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const availabilityFor = (inStock: boolean) =>
    product.madeToOrder
      ? "https://schema.org/PreOrder"
      : inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";

  const availability = availabilityFor(product.inStock);
  const rawImages = [
    ...(product.images ?? []),
    ...(product.imageUrl ? [product.imageUrl] : []),
  ]
    .map((img) => img.trim())
    .filter(Boolean);
  const images = Array.from(new Set(rawImages.map((img) => absoluteUrl(img))));
  const sku = product.sku?.trim() || product.variants?.[0]?.sku?.trim() || undefined;

  const shippingDetails = {
    "@type": "OfferShippingDetails",
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "NG",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 1,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 2,
        maxValue: 3,
        unitCode: "DAY",
      },
    },
  };

  const hasMerchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "NG",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 2,
    returnMethod: "https://schema.org/ReturnInStore",
  };

  const seller = {
    "@id": `${SITE_URL}/#store`,
    name: SITE_NAME,
  };

  const variants = product.variants ?? [];
  let offers: Record<string, unknown>;

  if (variants.length > 1) {
    const effectivePrices = variants.map((v) => v.salePrice ?? v.price);
    const lowPrice = Math.min(...effectivePrices);
    const highPrice = Math.max(...effectivePrices);
    const anyInStock =
      product.madeToOrder || variants.some((v) => !v.soldOut) || product.inStock;

    offers = {
      "@type": "AggregateOffer",
      url,
      priceCurrency: "NGN",
      lowPrice,
      highPrice,
      offerCount: variants.length,
      availability: availabilityFor(anyInStock),
      offers: variants.map((v) => ({
        "@type": "Offer",
        name: v.label,
        ...(v.sku?.trim() ? { sku: v.sku.trim() } : {}),
        url,
        priceCurrency: "NGN",
        price: v.salePrice ?? v.price,
        availability: availabilityFor(!v.soldOut),
        itemCondition: "https://schema.org/NewCondition",
        seller,
        shippingDetails,
        hasMerchantReturnPolicy,
      })),
    };
  } else {
    const singleVariant = variants[0];
    const effectivePrice = singleVariant
      ? singleVariant.salePrice ?? singleVariant.price
      : product.price;
    const singleOfferSku = singleVariant?.sku?.trim() || sku;

    offers = {
      "@type": "Offer",
      ...(singleOfferSku ? { sku: singleOfferSku } : {}),
      url,
      priceCurrency: "NGN",
      price: effectivePrice,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller,
      shippingDetails,
      hasMerchantReturnPolicy,
    };
  }

  const additionalProperty = (product.additionalProperty ?? [])
    .filter((prop) => prop.name.trim() && prop.value.trim())
    .map((prop) => ({
      "@type": "PropertyValue",
      name: prop.name.trim(),
      value: prop.value.trim(),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: images,
    category: product.category,
    url,
    ...(sku ? { sku } : {}),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers,
    ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
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
