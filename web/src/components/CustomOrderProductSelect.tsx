"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import {
  CUSTOM_ORDER_CATEGORIES,
  findCustomOrderCategory,
} from "@/lib/custom-orders";
import { cn } from "@/lib/utils";

export interface CustomOrderProductSelectProps {
  id: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Editorial product-family selector for custom orders with category thumbnails,
 * curated descriptions, and hairline-divided rows matching Ligera's palette.
 */
export function CustomOrderProductSelect({
  id,
  name,
  value,
  onValueChange,
  invalid = false,
  describedBy,
}: CustomOrderProductSelectProps) {
  const activeCategory = value ? findCustomOrderCategory(value) : undefined;

  return (
    <SelectPrimitive.Root
      name={name}
      value={value}
      onValueChange={(nextValue) => {
        // Radix's hidden SelectBubbleInput emits "" when `value` updates programmatically
        // before the portal menu has opened and registered its native <option> nodes.
        if (!nextValue) return;
        onValueChange(nextValue);
      }}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          "group flex min-h-[3.5rem] w-full cursor-pointer items-center justify-between gap-3 rounded-sm border bg-background px-3.5 py-2.5 text-left text-sm text-foreground outline-none transition-all duration-200 data-[placeholder]:text-muted-foreground/85",
          invalid
            ? "border-destructive/75 focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/20"
            : "border-clay/70 hover:border-forest/55 hover:bg-sand/20 focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-gold/35 data-[state=open]:border-forest data-[state=open]:bg-card data-[state=open]:shadow-[var(--shadow-soft)]",
        )}
      >
        <span className="min-w-0 flex-1">
          <SelectPrimitive.Value placeholder="Select a product…">
            {activeCategory ? (
              <span className="flex min-w-0 items-center gap-3">
                <img
                  src={activeCategory.image}
                  alt=""
                  aria-hidden="true"
                  className="h-9 w-9 shrink-0 rounded-sm border border-clay/45 object-cover"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-lg font-light leading-tight tracking-[-0.01em] text-forest">
                    {activeCategory.label}
                  </span>
                  <span className="truncate text-xs leading-snug text-ink/65">
                    {activeCategory.description}
                  </span>
                </span>
              </span>
            ) : null}
          </SelectPrimitive.Value>
        </span>

        <SelectPrimitive.Icon asChild>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-sand/55 text-forest/70 transition-colors duration-200 group-hover:bg-sand group-hover:text-forest group-data-[state=open]:bg-forest group-data-[state=open]:text-gold">
            <ChevronDown
              className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
              strokeWidth={1.6}
              aria-hidden="true"
            />
          </span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          align="start"
          className="z-50 flex max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] flex-col overflow-hidden rounded-sm border border-clay/60 border-t-2 border-t-gold bg-card text-foreground shadow-[var(--shadow-lift)] origin-[var(--radix-select-content-transform-origin)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[side=bottom]:slide-in-from-top-1.5 data-[side=top]:slide-in-from-bottom-1.5 duration-150"
        >
          <SelectPrimitive.Viewport className="w-full overflow-y-auto p-0">
            <SelectPrimitive.Group>
              <SelectPrimitive.Label className="flex items-center justify-between border-b border-clay/30 bg-sand/40 px-4 py-2 text-[10px] font-medium tracking-[0.22em] text-forest/80 uppercase">
                <span>Product family</span>
                <span className="font-display text-xs font-light tracking-[0.04em] text-muted-foreground normal-case">
                  {CUSTOM_ORDER_CATEGORIES.length} bespoke options
                </span>
              </SelectPrimitive.Label>

              {CUSTOM_ORDER_CATEGORIES.map((cat, idx) => (
                <SelectPrimitive.Item
                  key={cat.value}
                  value={cat.value}
                  textValue={cat.label}
                  className="group relative flex w-full cursor-pointer select-none items-center gap-3.5 border-b border-clay/25 px-4 py-3 text-left outline-none transition-colors duration-150 last:border-b-0 data-[highlighted]:bg-sand/45 data-[state=checked]:bg-sand/65"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[3px] bg-transparent transition-colors duration-150 group-data-[highlighted]:bg-clay/70 group-data-[state=checked]:bg-gold"
                  />
                  <img
                    src={cat.image}
                    alt=""
                    aria-hidden="true"
                    className="h-11 w-11 shrink-0 rounded-sm border border-clay/45 object-cover transition-colors duration-200 group-data-[highlighted]:border-forest/40 group-data-[state=checked]:border-gold"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className="font-display text-xs tracking-[0.08em] text-muted-foreground"
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate font-display text-lg font-light leading-snug tracking-[-0.01em] text-forest">
                        <SelectPrimitive.ItemText>{cat.label}</SelectPrimitive.ItemText>
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-ink/70">
                      {cat.description}
                    </p>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    <SelectPrimitive.ItemIndicator className="flex h-5 w-5 items-center justify-center rounded-full bg-forest text-gold">
                      <Check className="h-3 w-3" strokeWidth={2.25} />
                    </SelectPrimitive.ItemIndicator>
                  </div>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Group>
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
