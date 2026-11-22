import type { MetadataRoute } from "next";
import {
  getContentPageSafe,
  getPublicProductsSafe,
} from "@/lib/seo/catalog.server";
import { SEO_CATEGORIES } from "@/lib/seo/categories";
import { absoluteUrl } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

function parseDateSafe(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    products,
    ourStoryPage,
    faqsPage,
    candleSafetyPage,
    returnsPage,
    privacyPage,
    termsPage,
  ] = await Promise.all([
    getPublicProductsSafe(),
    getContentPageSafe("our-story"),
    getContentPageSafe("faqs"),
    getContentPageSafe("candle-safety"),
    getContentPageSafe("returns"),
    getContentPageSafe("privacy"),
    getContentPageSafe("terms"),
  ]);

  const allDates = [
    ...products.map((p) => parseDateSafe(p.updatedAt)),
    ...[
      ourStoryPage,
      faqsPage,
      candleSafetyPage,
      returnsPage,
      privacyPage,
      termsPage,
    ].map((page) => parseDateSafe(page?.updatedAt)),
  ].filter((d): d is Date => d !== null);

  const fallbackDate =
    allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => d.getTime())))
      : new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: fallbackDate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/collections"),
      lastModified: fallbackDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/custom-orders"),
      lastModified: fallbackDate,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/our-story"),
      lastModified: parseDateSafe(ourStoryPage?.updatedAt) ?? fallbackDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/delivery-returns"),
      lastModified: parseDateSafe(returnsPage?.updatedAt) ?? fallbackDate,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/faqs"),
      lastModified: parseDateSafe(faqsPage?.updatedAt) ?? fallbackDate,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/visit-us"),
      lastModified: fallbackDate,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/candle-safety"),
      lastModified: parseDateSafe(candleSafetyPage?.updatedAt) ?? fallbackDate,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: parseDateSafe(privacyPage?.updatedAt) ?? fallbackDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: parseDateSafe(termsPage?.updatedAt) ?? fallbackDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = SEO_CATEGORIES.map((cat) => ({
    url: absoluteUrl(`/collections/${cat.slug}`),
    lastModified: fallbackDate,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    lastModified: parseDateSafe(product.updatedAt) ?? fallbackDate,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
