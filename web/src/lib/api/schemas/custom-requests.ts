import { z } from "zod";

export const CustomRequestInput = z.object({
  contact: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().regex(/^(\+?234|0)\d{9,10}$/, "Enter a valid Nigerian phone number."),
  }),
  spaceOrSetting: z.string().trim().min(3).max(200),
  productTypes: z.array(z.enum(["candles", "diffusers", "sprays", "gypsum", "bundle"])).min(1),
  scentPreferences: z.string().trim().min(3).max(1000),
  quantity: z.number().int().min(1).max(5000).default(1),
  budgetRange: z.string().trim().max(60).default(""),
  eventDate: z.coerce.date().optional(),
  referenceImage: z
    .object({
      publicId: z.string().min(1),
      url: z.string().url(),
      alt: z.string().default("Reference image for custom request"),
    })
    .optional(),
  _hp: z.string().optional(),
});

export type CustomRequestInput = z.infer<typeof CustomRequestInput>;

export const StatusUpdateInput = z.object({
  status: z.enum(["new", "quoted", "accepted", "declined", "completed"]),
  note: z.string().max(500).optional(),
});

export const QuoteInput = z.object({
  amount: z.number().int().min(1000),
  note: z.string().max(1000).optional(),
  deliveryIncluded: z.boolean().default(true),
});
