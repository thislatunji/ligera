import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getContentPageSafe } from "@/lib/seo/catalog.server";
import { DEFAULT_PRIVACY_SECTIONS } from "@/lib/seo/content-defaults";
import { buildBreadcrumbJsonLd, safeJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/seo/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Privacy Policy (NDPA 2023)",
  description:
    "How Ligera collects, uses, and protects your order and contact information in line with the Nigeria Data Protection Act 2023 (NDPA 2023).",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Ligera",
    description: "Ligera Privacy Policy aligned with NDPA 2023.",
    url: absoluteUrl("/privacy"),
  },
};

export default async function PrivacyPage() {
  const cmsPage = await getContentPageSafe("privacy");
  const sections =
    cmsPage?.sections && cmsPage.sections.length > 0
      ? cmsPage.sections
      : DEFAULT_PRIVACY_SECTIONS;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Privacy Policy", path: "/privacy" },
  ]);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b-2 border-gold/50 bg-forest text-forest-foreground">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,oklch(0.7_0.075_78_/_0.14),transparent_55%)]"
          />
          <div className="relative mx-auto max-w-4xl px-5 py-14 md:py-20">
            <p className="eyebrow text-gold">Legal</p>
            <h1 className="mt-4 text-4xl leading-[1.08] text-forest-foreground sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-forest-foreground/75 sm:text-base">
              Aligned with the Nigeria Data Protection Act 2023 (NDPA 2023).
            </p>
          </div>
        </section>

        <section className="bg-sand/80">
          <div className="mx-auto max-w-4xl px-5 py-14 md:py-16">
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <article
                  key={`${section.heading}-${idx}`}
                  className="rounded-sm border border-clay/60 border-l-4 border-l-forest bg-card p-6 shadow-[var(--shadow-soft)] sm:p-7"
                >
                  <div className="flex items-start gap-4 sm:gap-5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-forest font-display text-sm text-gold"
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      {section.heading && (
                        <h2 className="text-2xl text-forest">{section.heading}</h2>
                      )}
                      <p className="mt-3 text-sm leading-relaxed text-ink/80 sm:text-base">
                        {section.body}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <nav
              aria-label="Related policies"
              className="mt-10 flex flex-wrap gap-5 border-t border-clay/50 pt-6 text-xs"
            >
              <Link
                href="/terms"
                className="font-medium text-forest underline underline-offset-4 hover:text-gold"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                href="/delivery-returns"
                className="font-medium text-forest underline underline-offset-4 hover:text-gold"
              >
                Delivery &amp; Returns
              </Link>
              <Link
                href="/faqs"
                className="font-medium text-forest underline underline-offset-4 hover:text-gold"
              >
                FAQs
              </Link>
            </nav>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
