import mongoose from "mongoose";
import { connectDb } from "../src/lib/db/connect";

const CONTENT_PAGES = [
  {
    slug: "our-story",
    title: "Our Story",
    sections: [
      {
        heading: "Our Story",
        body: "Ligera was born to illuminate every space with thoughtfully crafted fragrance.",
        image: null,
      },
    ],
    seo: { title: "Our Story | Ligera", metaDescription: "Learn about Ligera." },
  },
  {
    slug: "faqs",
    title: "FAQs",
    sections: [
      { heading: "Do you deliver?", body: "Yes, we deliver nationwide.", image: null },
      { heading: "What is your return policy?", body: "Please see our Returns & Refunds page.", image: null },
      { heading: "Can I cancel my order?", body: "Orders can be cancelled before fulfillment as stated in our policy.", image: null },
      { heading: "Do you offer gift wrapping?", body: "Gift notes are supported at checkout.", image: null },
      { heading: "How long does delivery take?", body: "Delivery timelines depend on your delivery zone.", image: null },
      { heading: "Are your candles safe?", body: "Please refer to our Candle Safety guide.", image: null },
    ],
    seo: { title: "FAQs | Ligera", metaDescription: "Frequently asked questions." },
  },
  {
    slug: "delivery-returns",
    title: "Delivery & Returns",
    sections: [
      { heading: "Delivery", body: "We offer delivery across Nigeria with zone-based fees.", image: null },
      { heading: "Returns", body: "Returns are subject to our returns policy.", image: null },
    ],
    seo: { title: "Delivery & Returns | Ligera", metaDescription: "Delivery and returns information." },
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    sections: [
      {
        heading: "Privacy Notice (NDPA 2023)",
        body: "Ligera is committed to protecting your personal data in accordance with the Nigeria Data Protection Act 2023 (NDPA 2023). We collect only necessary information to process your orders and communications, and we process your data lawfully and transparently.",
        image: null,
      },
      {
        heading: "Your Rights",
        body: "You have rights under NDPA 2023 including the right to access, rectify, erase, and restrict processing of your personal data, and to object to certain processing.",
        image: null,
      },
    ],
    seo: { title: "Privacy Policy | Ligera", metaDescription: "Ligera Privacy Policy in line with NDPA 2023." },
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    sections: [
      { heading: "Terms of Use", body: "By using our site, you agree to these terms.", image: null },
    ],
    seo: { title: "Terms & Conditions | Ligera", metaDescription: "Ligera terms and conditions." },
  },
  {
    slug: "returns",
    title: "Returns & Refunds",
    sections: [
      { heading: "Returns", body: "If you are not satisfied, please contact us in line with our returns policy.", image: null },
      { heading: "Refunds", body: "Refunds will be processed as per our policy.", image: null },
    ],
    seo: { title: "Returns & Refunds | Ligera", metaDescription: "Returns and refunds policy." },
  },
  {
    slug: "candle-safety",
    title: "Candle Safety",
    sections: [
      { heading: "Safety Guidelines", body: "Always trim wicks, keep away from drafts and flammable items, and never leave candles unattended.", image: null },
    ],
    seo: { title: "Candle Safety | Ligera", metaDescription: "Candle safety guidelines." },
  },
];

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

export async function up() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("db not available");

  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  if (!names.includes("content_pages")) {
    await db.createCollection("content_pages");
  }
  if (!names.includes("settings")) {
    await db.createCollection("settings");
  }

  await db.collection("content_pages").createIndex({ slug: 1 }, { unique: true });

  // Seed content pages (idempotent)
  for (const page of CONTENT_PAGES) {
    await db.collection("content_pages").updateOne(
      { slug: page.slug },
      { $setOnInsert: { ...page, updatedBy: null, createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
  }

  // Seed settings singleton (idempotent)
  const settingsCount = await db.collection("settings").countDocuments();
  if (settingsCount === 0) {
    await db.collection("settings").insertOne({
      ...DEFAULT_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Orders indexes
  try {
    await db.collection("orders").createIndex({ status: 1, paidAt: 1 });
  } catch (e) {
    // ignore
  }
  try {
    await db.collection("orders").createIndex({ "items.productId": 1, status: 1 });
  } catch (e) {
    // ignore
  }

  console.log("Admin portal migration up complete");
}

export async function down() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("db not available");
  await db.dropCollection("content_pages").catch(() => {});
  // reset settings? specs say "reset settings" - drop or clear; be conservative
  await db.collection("settings").deleteMany({}).catch(() => {});
  try {
    await db.collection("orders").dropIndex("status_1_paidAt_1");
  } catch (e) {}
  try {
    await db.collection("orders").dropIndex("items.productId_1_status_1");
  } catch (e) {}
  console.log("Admin portal migration down complete");
}

if (require.main === module) {
  up().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
