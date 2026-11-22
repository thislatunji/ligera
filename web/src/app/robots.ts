import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

const DISALLOWED_PATHS = [
  "/admin",
  "/admin/",
  "/auth",
  "/cart",
  "/checkout",
  "/order",
  "/order/",
  "/api/",
  "/custom-requests/thanks",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
