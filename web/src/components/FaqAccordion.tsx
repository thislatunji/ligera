"use client";

import type { FaqEntry } from "@/lib/seo/content-defaults";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface FaqAccordionProps {
  items: FaqEntry[];
  variant?: "card" | "sand";
  defaultOpenFirst?: boolean;
  className?: string;
}

/**
 * Interactive single-open FAQ accordion styled in the Ligera editorial system.
 */
export function FaqAccordion({
  items,
  variant = "card",
  defaultOpenFirst = false,
  className,
}: FaqAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpenFirst && items.length > 0 ? "faq-0" : undefined}
      className={cn("space-y-4", className)}
    >
      {items.map((faq, idx) => {
        const isForestAccent = variant === "card" ? idx % 2 === 0 : idx % 2 === 1;

        return (
          <AccordionItem
            key={`${faq.question}-${idx}`}
            value={`faq-${idx}`}
            className={cn(
              "rounded-sm border border-l-4 shadow-[var(--shadow-soft)] transition-colors data-[state=open]:border-clay/80",
              variant === "card" ? "border-clay/60 bg-card" : "border-clay/55 bg-sand/65",
              isForestAccent ? "border-l-forest" : "border-l-gold",
            )}
          >
            <AccordionTrigger
              className={cn(
                "group gap-4 px-5 py-5 text-left font-display text-xl font-light leading-snug tracking-[-0.01em] text-forest hover:no-underline sm:px-7 sm:py-6 sm:text-2xl",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-inset",
                "[&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-forest/65 [&[data-state=open]>svg]:text-gold",
              )}
            >
              <span className="flex items-start gap-4 sm:gap-5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm font-display text-sm",
                    isForestAccent
                      ? "bg-forest text-gold"
                      : "border border-sage/70 bg-sage/30 text-forest",
                  )}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="transition-colors group-hover:text-forest/80">
                  {faq.question}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-0 sm:px-7 sm:pb-6">
              <div className="border-t border-clay/35 pt-4 sm:pl-[3.25rem]">
                <p className="text-sm leading-relaxed text-ink/80 sm:text-base">
                  {faq.answer}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
