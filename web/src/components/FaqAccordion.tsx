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
 * Interactive single-open FAQ accordion styled in an even, low-contrast warm neutral surface.
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
      className={cn(
        "overflow-hidden rounded-sm border border-clay/35",
        variant === "card" ? "bg-card/90" : "bg-sand/45",
        className,
      )}
    >
      {items.map((faq, idx) => (
        <AccordionItem
          key={`${faq.question}-${idx}`}
          value={`faq-${idx}`}
          className={cn(
            "border-b border-clay/30 transition-colors last:border-b-0",
            variant === "card"
              ? "hover:bg-sand/25 data-[state=open]:bg-sand/35"
              : "hover:bg-sand/65 data-[state=open]:bg-sand/75",
          )}
        >
          <AccordionTrigger
            className={cn(
              "group gap-4 px-5 py-5 text-left font-display text-xl font-light leading-snug tracking-[-0.01em] text-ink hover:no-underline sm:px-7 sm:py-6 sm:text-2xl",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/70 focus-visible:ring-inset",
              "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&[data-state=open]>svg]:text-ink/80",
            )}
          >
            <span className="flex items-baseline gap-4 sm:gap-5">
              <span
                aria-hidden="true"
                className="w-6 shrink-0 font-display text-sm tracking-[0.08em] text-muted-foreground"
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="transition-colors group-hover:text-ink/75">
                {faq.question}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent forceMount className="px-5 pb-5 pt-0 sm:px-7 sm:pb-6">
            <div className="sm:pl-11">
              <p className="text-sm leading-relaxed text-ink/75 sm:text-base">
                {faq.answer}
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
