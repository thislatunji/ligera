import { z } from "zod";

export const SettingsPatch = z.object({
  store: z
    .object({
      name: z.string().min(1).max(80).optional(),
      tagline: z.string().max(120).optional(),
      logoPublicId: z.string().optional(),
      contactEmail: z.string().email().optional(),
      phone: z.string().max(30).optional(),
      whatsappNumber: z.string().regex(/^\d{10,14}$/).optional(),
      instagram: z.string().url().optional(),
      openingHours: z.string().max(120).optional(),
    })
    .partial()
    .optional(),
  delivery: z
    .object({
      freeDeliveryThreshold: z.number().int().min(0).optional(),
      cutOffTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
      blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
      pickup: z
        .object({
          enabled: z.boolean(),
          address: z.string().max(300),
          hours: z.string().max(120),
        })
        .optional(),
    })
    .partial()
    .optional(),
  payment: z.object({ payOnDelivery: z.boolean() }).partial().optional(),
  homepage: z
    .object({
      announcement: z.object({ text: z.string().max(140), active: z.boolean() }).optional(),
      hero: z
        .object({
          headline: z.string().max(90),
          subline: z.string().max(160),
          image: z.object({ publicId: z.string(), alt: z.string() }),
          ctaText: z.string().max(30),
          ctaHref: z.string(),
        })
        .optional(),
      featuredCollectionIds: z.array(z.string()).max(6).optional(),
      instagramPosts: z
        .array(z.object({ publicId: z.string(), alt: z.string(), url: z.string().url() }))
        .max(6)
        .optional(),
      newsletterEnabled: z.boolean().optional(),
    })
    .partial()
    .optional(),
  emailTemplates: z
    .record(
      z.string(),
      z.object({
        subject: z.string().max(120),
        body: z.string().max(4000),
      })
    )
    .optional(),
});

export type SettingsPatch = z.infer<typeof SettingsPatch>;

export const ContentPageInput = z.object({
  title: z.string().min(1).max(120),
  sections: z
    .array(
      z.object({
        heading: z.string().max(160).default(""),
        body: z.string().max(8000),
        image: z
          .object({ publicId: z.string(), alt: z.string() })
          .nullable()
          .optional(),
      })
    )
    .max(20),
  seo: z.object({
    title: z.string().max(70).default(""),
    metaDescription: z.string().max(160).default(""),
  }),
});

export type ContentPageInput = z.infer<typeof ContentPageInput>;

export const ZoneInput = z.object({
  name: z.string().trim().min(1).max(80),
  fee: z.number().int().min(0),
  etaText: z.string().max(120).default(""),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export type ZoneInput = z.infer<typeof ZoneInput>;

export const ActivityLogQuery = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type ActivityLogQuery = z.infer<typeof ActivityLogQuery>;

export const CustomerQuery = z.object({
  q: z.string().max(120).optional(),
  consentOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CustomerQuery = z.infer<typeof CustomerQuery>;
