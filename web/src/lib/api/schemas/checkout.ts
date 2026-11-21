import { z } from "zod";

export const CartLineInput = z.object({
  variantId: z.string(),
  qty: z.number().int().min(1).max(99),
});

export const QuoteRequest = z.object({
  items: z.array(CartLineInput).min(1).max(50),
  zoneId: z.string().optional(),
  deliveryMethod: z.enum(["delivery", "pickup"]).default("delivery"),
});
export type QuoteRequest = z.infer<typeof QuoteRequest>;

export const CheckoutRequest = z.object({
  contact: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().regex(/^(\+?234|0)\d{9,10}$/, "Enter a valid Nigerian phone number."),
  }),
  address: z
    .object({
      address: z.string().trim().min(4).max(300),
      city: z.string().trim().min(1).max(100),
      state: z.string().trim().min(2).max(50),
    })
    .optional(),
  zoneId: z.string().optional(),
  deliveryMethod: z.enum(["delivery", "pickup"]).default("delivery"),
  giftNote: z.string().trim().max(500).default(""),
  hidePrices: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
  items: z.array(CartLineInput).min(1).max(50),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequest>;

export const OrderLookupRequest = z
  .object({
    orderNumber: z.string().trim().regex(/^LG-\d{6}$/),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
  })
  .refine((v) => v.email || v.phone, "Provide the email or phone used at checkout.");
export type OrderLookupRequest = z.infer<typeof OrderLookupRequest>;

export const FlutterwaveWebhook = z.object({
  event: z.string(),
  data: z
    .object({
      id: z.number(),
      tx_ref: z.string(),
      amount: z.number(),
      currency: z.string(),
      status: z.string(),
      created_at: z.string().optional(),
    })
    .passthrough(),
});
export type FlutterwaveWebhook = z.infer<typeof FlutterwaveWebhook>;
