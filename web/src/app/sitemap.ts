import type { MetadataRoute } from "next";
import { getPublicProductsSafe } from "@/lib/seo/catalog.server";
import { SEO_CATEGORIES } from "@/lib/seo/categories";
import { absoluteUrl } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublicProductsSafe();
  const buildDate = new Date("2026-11-21T00:00:00.000Z");

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/collections"),
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/custom-orders"),
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/our-story"),
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/delivery-returns"),
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/faqs"),
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/visit-us"),
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/candle-safety"),
      lastModified: buildDate,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: buildDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: buildDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = SEO_CATEGORIES.map((cat) => ({
    url: absoluteUrl(`/collections/${cat.slug}`),
    lastModified: buildDate,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    lastModified: product.updatedAt ? new Date(product.updatedAt) : buildDate,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
