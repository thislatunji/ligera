import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReedDiffuserAnimation } from "@/components/ReedDiffuserAnimation";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="relative flex flex-1 items-center overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_45%,oklch(0.935_0.021_82_/_0.55),transparent_62%)]"
        />

        <div className="relative z-10 mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-10 px-5 py-14 md:grid-cols-12 md:gap-14 md:py-20">
          {/* Animated Reed Diffuser inside a sculpted studio niche */}
          <div className="flex flex-col items-center md:col-span-6">
            <div className="relative flex w-full max-w-[340px] flex-col items-center justify-center rounded-t-full border border-border/70 bg-gradient-to-b from-sand/65 via-sand/25 to-background/60 px-6 pt-8 pb-5 shadow-[var(--shadow-soft)]">
              <ReedDiffuserAnimation />
              <p className="mt-2 text-[11px] tracking-[0.18em] text-muted-foreground/75 uppercase">
                Tap diffuser to stir the scent
              </p>
            </div>
          </div>

          {/* Copy & Navigation */}
          <div className="text-center md:col-span-6 md:text-left">
            <p className="eyebrow text-gold">404 · Page Not Found</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] sm:text-5xl md:text-6xl">
              This scent has <em className="italic text-gold">drifted</em> away.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base md:mx-0">
              The page you’re looking for may have moved, retired from the shelf, or never been
              poured. Let us guide you gently back home.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link href="/" className="btn-gold">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                Return home
              </Link>
              <Link href="/collections" className="btn-outline-soft">
                Browse collections
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
