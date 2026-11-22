"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, MapPin, MessageCircle, Phone } from "lucide-react";
import { CustomOrderProductSelect } from "@/components/CustomOrderProductSelect";
import {
  CUSTOM_ORDER_CATEGORIES,
  DEFAULT_CUSTOM_ORDER_IMAGE,
  LIGERA_WHATSAPP_DISPLAY,
  buildCustomOrderWhatsAppUrl,
  findCustomOrderCategory,
} from "@/lib/custom-orders";

type FormErrors = {
  product?: string;
  details?: string;
};

export function CustomOrderForm() {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("product");
    if (param) {
      const match = findCustomOrderCategory(param);
      if (match) {
        setSelectedProduct(match.value);
      }
    }
  }, []);

  const activeCategory = selectedProduct
    ? findCustomOrderCategory(selectedProduct)
    : undefined;

  const handleProductChange = (value: string) => {
    setSelectedProduct(value);
    setSubmittedUrl(null);
    if (errors.product) {
      setErrors((prev) => ({ ...prev, product: undefined }));
    }
  };

  const handleDetailsChange = (value: string) => {
    setDetails(value);
    setSubmittedUrl(null);
    if (errors.details) {
      setErrors((prev) => ({ ...prev, details: undefined }));
    }
  };

  const handleReset = () => {
    setSelectedProduct("");
    setDetails("");
    setErrors({});
    setSubmittedUrl(null);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};

    if (!selectedProduct.trim()) {
      nextErrors.product = "Please select a product to custom order.";
    }
    if (!details.trim()) {
      nextErrors.details = "Please provide details for your custom order.";
    }

    if (nextErrors.product || nextErrors.details) {
      setErrors(nextErrors);
      setSubmittedUrl(null);
      return;
    }

    setErrors({});
    const url = buildCustomOrderWhatsAppUrl(selectedProduct, details);
    setSubmittedUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="grid gap-12 md:grid-cols-[1.35fr_1fr]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-sm border border-clay/60 border-t-4 border-t-gold bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8"
      >
        <div>
          <label htmlFor="custom-order-product" className="block">
            <span className="eyebrow text-forest">Product</span>
          </label>
          <div className="mt-2">
            <CustomOrderProductSelect
              id="custom-order-product"
              name="product"
              value={selectedProduct}
              onValueChange={handleProductChange}
              invalid={Boolean(errors.product)}
              describedBy={errors.product ? "custom-order-product-error" : undefined}
            />
          </div>
          {errors.product && (
            <p
              id="custom-order-product-error"
              role="alert"
              className="mt-2 text-xs text-destructive"
            >
              {errors.product}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="custom-order-details" className="block">
            <span className="eyebrow text-forest">Further details</span>
          </label>
          <textarea
            id="custom-order-details"
            name="details"
            rows={6}
            value={details}
            onChange={(e) => handleDetailsChange(e.target.value)}
            placeholder={
              activeCategory?.placeholder ??
              "Share your scent preferences, vessel finish, quantity, occasion, or target date…"
            }
            aria-invalid={Boolean(errors.details)}
            aria-describedby={errors.details ? "custom-order-details-error" : undefined}
            className="mt-2 w-full resize-y rounded-sm border border-clay/70 bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-forest"
          />
          {errors.details && (
            <p
              id="custom-order-details-error"
              role="alert"
              className="mt-2 text-xs text-destructive"
            >
              {errors.details}
            </p>
          )}
        </div>

        <div>
          <button type="submit" className="btn-gold w-full cursor-pointer sm:w-auto">
            <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
            Make Custom Order
          </button>
        </div>

        {submittedUrl && (
          <div className="rounded-sm border border-gold/50 bg-sand/70 p-4 text-xs leading-relaxed text-ink/80">
            <div className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.75} />
              <div>
                <p className="text-foreground">
                  WhatsApp has been opened with your custom order details.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <a
                    href={submittedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-forest underline underline-offset-4 hover:text-gold"
                  >
                    Open WhatsApp again
                  </a>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="cursor-pointer text-ink/75 underline underline-offset-4 hover:text-foreground"
                  >
                    Clear form
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      <aside className="space-y-6">
        <div className="overflow-hidden rounded-sm border border-clay/60 bg-card shadow-[var(--shadow-soft)]">
          <img
            src={activeCategory?.image ?? DEFAULT_CUSTOM_ORDER_IMAGE}
            alt={
              activeCategory
                ? `${activeCategory.label} bespoke preview`
                : "Ligera bespoke home fragrance studio"
            }
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="p-6">
            {!activeCategory && <p className="eyebrow text-forest">Bespoke studio</p>}
            <h2 className={activeCategory ? "text-2xl text-forest" : "mt-2 text-2xl text-forest"}>
              {activeCategory ? activeCategory.label : "Made to order in Lagos"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              {activeCategory
                ? activeCategory.description
                : "From weddings and corporate gifting to signature scents for residences and short-lets, every custom order is composed in our Gbagada studio."}
            </p>
          </div>
        </div>

        <div className="rounded-sm border border-gold/25 bg-forest p-6 text-forest-foreground shadow-[var(--shadow-soft)] sm:p-7">
          <p className="eyebrow text-gold">How it works</p>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-forest-foreground/85">
            <li className="flex gap-2.5">
              <span className="font-display text-base text-gold">1.</span>
              <span>Choose the product family you would like to customize.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-display text-base text-gold">2.</span>
              <span>
                Add your scent notes, colors, quantity, or occasion details.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-display text-base text-gold">3.</span>
              <span>
                Click <strong className="font-medium text-forest-foreground">Custom order</strong> to
                chat with our studio on WhatsApp for pricing and delivery timelines.
              </span>
            </li>
          </ol>

          <div className="mt-6 space-y-2.5 border-t border-forest-foreground/15 pt-5 text-xs text-forest-foreground/75">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={1.5} />
              <span>43 Onabola Street, Pedro Road, Gbagada, Lagos</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={1.5} />
              <a href="tel:08096613114" className="hover:text-gold">
                {LIGERA_WHATSAPP_DISPLAY}
              </a>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
