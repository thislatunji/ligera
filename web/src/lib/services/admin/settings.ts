import { connectDb } from "@/lib/db/connect";
import { Settings } from "@/lib/db/models/settings";
import { ActivityLog } from "@/lib/db/models/activityLog";
import mongoose from "mongoose";

let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL = 60 * 1000;

const DEFAULT_SETTINGS = {
  store: {
    name: "Ligera",
    tagline: "Illuminate Every Space",
    logoPublicId: "ligera/gold-mark",
    contactEmail: "orders@ligerascents.com",
    phone: "+2348096613114",
    whatsappNumber: "2348096613114",
    instagram: "https://www.instagram.com/ligera.est26/",
    openingHours: "Mon–Sat, 9am–6pm WAT",
  },
  delivery: {
    freeDeliveryThreshold: 150000,
    cutOffTime: "15:00",
    blackoutDates: [],
    pickup: {
      enabled: true,
      address: "43 Onabola Street, Pedro Road, Gbagada, Lagos",
      hours: "Mon–Sat, 9am–6pm WAT",
    },
  },
  payment: { payOnDelivery: false },
  homepage: {
    announcement: { text: "Free delivery over ₦150,000", active: true },
    hero: {
      headline: "Illuminate every space",
      subline: "Thoughtfully crafted fragrances for home and gifting.",
      image: { publicId: "ligera/hero", alt: "Ligera candles" },
      ctaText: "Shop Now",
      ctaHref: "/collections",
    },
    featuredCollectionIds: [],
    instagramPosts: [],
    newsletterEnabled: true,
  },
  seo: {
    defaultTitle: "Ligera — Luxury Scented Candles, Reed Diffusers & Gypsum Decor in Lagos",
    defaultDescription:
      "Lagos home fragrance house in Gbagada crafting hand-poured scented candles, reed diffusers, room & linen sprays, and sculpted gypsum decor.",
  },
  emailTemplates: {},
};

function mergeDeep(target: any, source: any) {
  if (!source || typeof source !== "object") return target;
  const out = { ...(target || {}) };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      out[key] = mergeDeep(target?.[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

export async function getSettings() {
  await connectDb();
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data;
  }
  let settings = await Settings.findOne().lean();
  if (!settings) {
    settings = await Settings.create({ ...DEFAULT_SETTINGS });
  }
  // Merge with defaults for safety
  const merged = mergeDeep(DEFAULT_SETTINGS, settings);
  cache = { data: merged, expiresAt: Date.now() + CACHE_TTL };
  return merged;
}

export function invalidateSettingsCache() {
  cache = null;
}

export async function updateSettings(patch: any, userId: string) {
  await connectDb();
  const before = await getSettings();
  const current = await Settings.findOne().lean();
  const merged = mergeDeep(current || {}, patch);
  // Ensure singleton exists
  let settingsDoc = await Settings.findOne();
  if (!settingsDoc) {
    settingsDoc = await Settings.create(merged);
  } else {
    // Apply patch shallow per top-level key as per spec
    for (const key of Object.keys(patch || {})) {
      (settingsDoc as any)[key] = mergeDeep((settingsDoc as any)[key] || {}, patch[key]);
    }
    await settingsDoc.save();
  }
  invalidateSettingsCache();
  const after = await getSettings();
  try {
    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action: "settings.update",
      entity: { type: "settings", id: "singleton" },
      before: Object.fromEntries(Object.keys(patch || {}).map((k) => [k, (before as any)[k]])),
      after: Object.fromEntries(Object.keys(patch || {}).map((k) => [k, (after as any)[k]])),
    });
  } catch (e) {}
  return after;
}
