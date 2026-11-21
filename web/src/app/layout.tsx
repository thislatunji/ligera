import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { buildSiteGraphJsonLd, safeJsonLd } from "@/lib/seo/jsonld";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo/site";
import "@/styles.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ligera — Luxury Scented Candles, Reed Diffusers & Gypsum Decor in Lagos",
    template: "%s | Ligera",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Ligera — Luxury Scented Candles, Reed Diffusers & Gypsum Decor in Lagos",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Ligera — Hand-poured scented candles, reed diffusers, room sprays, and gypsum decor in Lagos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ligera — Luxury Scented Candles, Reed Diffusers & Gypsum Decor in Lagos",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteGraphJsonLd = buildSiteGraphJsonLd();

  return (
    <html lang="en-NG" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(siteGraphJsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
