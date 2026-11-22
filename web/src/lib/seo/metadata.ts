import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  SITE_NAME,
  absoluteUrl,
} from "./site";

export interface PageMetadataOptions {
  title: string;
  absoluteTitle?: boolean;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "article";
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
}

export function buildPageMetadata(opts: PageMetadataOptions): Metadata {
  const fullTitle = opts.absoluteTitle
    ? opts.title
    : `${opts.title} | ${SITE_NAME}`;
  const ogTitle = opts.ogTitle ?? fullTitle;
  const ogDescription = opts.ogDescription ?? opts.description;

  const resolvedImage = opts.image
    ? {
        url: opts.image.url,
        ...(opts.image.width ? { width: opts.image.width } : {}),
        ...(opts.image.height ? { height: opts.image.height } : {}),
        alt: opts.image.alt ?? fullTitle,
      }
    : {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: DEFAULT_OG_IMAGE_ALT,
      };

  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: {
      canonical: opts.path,
      types: {
        "text/plain": absoluteUrl("/llms.txt"),
      },
    },
    openGraph: {
      type: opts.ogType ?? "website",
      locale: "en_NG",
      siteName: SITE_NAME,
      url: absoluteUrl(opts.path),
      title: ogTitle,
      description: ogDescription,
      images: [resolvedImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [resolvedImage.url],
    },
  };
}
