import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const COLLECTION_NAMES = [
  "categories",
  "products",
  "variants",
  "deliveryzones",
  "settings",
  "contentpages",
  "counters",
  "users",
  "orders",
  "payments",
  "customers",
  "customrequests",
  "notificationlogs",
  "stockadjustments",
  "activitylogs",
];

const TAXONOMY_CATEGORIES = [
  {
    name: "Scented Candles",
    slug: "scented-candles",
    type: "category",
    sortOrder: 1,
    active: true,
    image: { publicId: "/products/p-candle.jpg", alt: "Ligera hand-poured scented candles" },
    description:
      "Hand-poured in small batches in our Gbagada, Lagos studio using clean-burning wax and hand-trimmed cotton wicks, cured slowly for a warm, lingering scent throw. Available for Lagos dispatch, Gbagada studio pickup, and nationwide delivery across Nigeria.",
  },
  {
    name: "Reed Diffusers",
    slug: "reed-diffusers",
    type: "category",
    sortOrder: 2,
    active: true,
    image: { publicId: "/products/p-diffuser.jpg", alt: "Ligera reed diffuser collection" },
    description:
      "Composed with layered top, heart, and base fragrance notes paired with natural reeds for effortless, flameless scenting in homes, offices, and short-let apartments. Fast dispatch across Lagos with studio pickup in Gbagada and nationwide delivery.",
  },
  {
    name: "Room & Linen Sprays",
    slug: "room-linen-sprays",
    type: "category",
    sortOrder: 3,
    active: true,
    image: { publicId: "/products/p-spray.jpg", alt: "Ligera room and linen spray collection" },
    description:
      "Fine, lingering fragrance mists made for freshly laundered sheets, pillows, curtains, and living rooms whenever a space calls for an instant reset. Hand-mixed in Gbagada, Lagos and delivered across Lagos and Nigeria.",
  },
  {
    name: "Gypsum Decor",
    slug: "gypsum-decor",
    type: "category",
    sortOrder: 4,
    active: true,
    image: { publicId: "/products/p-gypsum.jpg", alt: "Handcrafted Ligera gypsum decor trays and vases" },
    description:
      "Each arch tray, ribbed vessel, and curve vase is cast in mineral gypsum, hand-sanded smooth, and sealed against water and wax in our Gbagada workbench. Styled alone or paired with our candles and diffusers.",
  },
  {
    name: "Gift Sets & Bundles",
    slug: "gift-sets-bundles",
    type: "category",
    sortOrder: 5,
    active: true,
    image: null,
    description:
      "Curated gift sets pairing Ligera candles, reed diffusers, room sprays, and handcrafted gypsum decor.",
  },
  {
    name: "Custom & Bespoke",
    slug: "custom-bespoke",
    type: "category",
    sortOrder: 6,
    active: true,
    image: null,
    description:
      "Bespoke fragrances, custom labels, and sculpted gypsum vessels crafted in Gbagada for weddings, events, and corporate gifting.",
  },
];

const TAXONOMY_SPACES = [
  { name: "Bedroom", slug: "bedroom", type: "space", sortOrder: 1, active: true, description: "", image: null },
  { name: "Living Room", slug: "living-room", type: "space", sortOrder: 2, active: true, description: "", image: null },
  { name: "Bathroom", slug: "bathroom", type: "space", sortOrder: 3, active: true, description: "", image: null },
  { name: "Kitchen", slug: "kitchen", type: "space", sortOrder: 4, active: true, description: "", image: null },
  { name: "Office", slug: "office", type: "space", sortOrder: 5, active: true, description: "", image: null },
  { name: "Entryway", slug: "entryway", type: "space", sortOrder: 6, active: true, description: "", image: null },
  { name: "Events", slug: "events", type: "space", sortOrder: 7, active: true, description: "", image: null },
];

const PRODUCTS = [
  {
    slug: "amber-hush",
    name: "Amber Hush",
    categorySlug: "scented-candles",
    categoryLabel: "Scented Candles",
    spaceSlugs: ["living-room", "bedroom"],
    price: 18500,
    stock: 24,
    sku: "LG-AMBER-HUSH-STD",
    image: "/products/p-candle.jpg",
    sortOrder: 1,
    notesLine: "Amber · Vanilla · Cedar",
    description:
      "A warm, grounding hand-poured scented candle layering golden amber, creamy vanilla, and smooth cedarwood. Poured in small batches in Gbagada, Lagos with a hand-trimmed cotton wick for a clean, steady glow.",
    scentNotes: { top: ["Warm Amber"], heart: ["Creamy Vanilla"], base: ["Cedarwood"] },
    finish: "Hand-poured wax · Cotton wick",
    safetyInfo:
      "Trim wick to 5mm before lighting. Burn on a heat-safe surface away from drafts for up to 4 hours per session.",
    pairsWithSlugs: ["arch-tray", "saffron-reed"],
  },
  {
    slug: "linen-morning",
    name: "Linen Morning",
    categorySlug: "scented-candles",
    categoryLabel: "Scented Candles",
    spaceSlugs: ["bedroom", "bathroom"],
    price: 16000,
    stock: 18,
    sku: "LG-LINEN-MORNING-STD",
    image: "/products/p-candle.jpg",
    sortOrder: 2,
    notesLine: "Cotton · White Tea · Musk",
    description:
      "Crisp cotton, airy white tea, and soft skin musk come together in a calm, sunlit candle designed for bedrooms, bathrooms, and slow weekend mornings.",
    scentNotes: { top: ["Fresh Cotton"], heart: ["White Tea"], base: ["Soft Musk"] },
    finish: "Hand-poured wax · Cotton wick",
    safetyInfo:
      "Trim wick to 5mm before each burn and allow the wax pool to reach the jar edge on the first lighting.",
    pairsWithSlugs: ["soft-veil", "curve-vase"],
  },
  {
    slug: "saffron-reed",
    name: "Saffron Reed",
    categorySlug: "reed-diffusers",
    categoryLabel: "Reed Diffusers",
    spaceSlugs: ["living-room", "entryway"],
    price: 24000,
    stock: 12,
    sku: "LG-SAFFRON-REED-STD",
    image: "/products/p-diffuser.jpg",
    sortOrder: 3,
    notesLine: "Saffron · Oud · Fig",
    description:
      "An opulent, flameless reed diffuser blending spiced saffron, smoky oud, and ripe fig. Formulated in our Lagos studio for continuous scent diffusion in living rooms, foyers, and short-let residences.",
    scentNotes: { top: ["Saffron"], heart: ["Ripe Fig"], base: ["Oud"] },
    finish: "Glass vessel · Natural reeds",
    safetyInfo:
      "Keep upright away from open flames and direct heat. Flip reeds periodically to refresh throw and wipe spills immediately.",
    pairsWithSlugs: ["amber-hush", "arch-tray"],
  },
  {
    slug: "gbagada-dusk",
    name: "Gbagada Dusk",
    categorySlug: "reed-diffusers",
    categoryLabel: "Reed Diffusers",
    spaceSlugs: ["living-room", "office"],
    price: 26500,
    stock: 10,
    sku: "LG-GBAGADA-DUSK-STD",
    image: "/products/p-diffuser.jpg",
    sortOrder: 4,
    notesLine: "Neroli · Amberwood · Smoke",
    description:
      "Named after our Lagos studio home, Gbagada Dusk pairs bright neroli blossom with resinous amberwood and subtle evening smoke for an understated, atmospheric reed diffuser.",
    scentNotes: { top: ["Neroli"], heart: ["Amberwood"], base: ["Warm Smoke"] },
    finish: "Glass vessel · Natural reeds",
    safetyInfo:
      "Place on a stable surface or tray away from children and pets. Wash hands after flipping diffuser reeds.",
    pairsWithSlugs: ["night-bloom", "arch-tray"],
  },
  {
    slug: "soft-veil",
    name: "Soft Veil",
    categorySlug: "room-linen-sprays",
    categoryLabel: "Room & Linen Sprays",
    spaceSlugs: ["bedroom", "living-room"],
    price: 12000,
    stock: 30,
    sku: "LG-SOFT-VEIL-STD",
    image: "/products/p-spray.jpg",
    sortOrder: 5,
    notesLine: "Peony · Bergamot · Cashmere",
    description:
      "A fine room and linen mist uniting delicate peony petals, bright bergamot, and comforting cashmere—ideal for refreshing freshly laundered bedding, curtains, and living areas.",
    scentNotes: { top: ["Bergamot"], heart: ["Peony"], base: ["Cashmere"] },
    finish: "Fine mist spray bottle",
    safetyInfo:
      "Mist into open air or lightly onto linens from 30cm away. Keep away from eyes and open flames.",
    pairsWithSlugs: ["linen-morning", "curve-vase"],
  },
  {
    slug: "night-bloom",
    name: "Night Bloom",
    categorySlug: "room-linen-sprays",
    categoryLabel: "Room & Linen Sprays",
    spaceSlugs: ["bedroom", "living-room"],
    price: 13500,
    stock: 22,
    sku: "LG-NIGHT-BLOOM-STD",
    image: "/products/p-spray.jpg",
    sortOrder: 6,
    notesLine: "Jasmine · Tonka · Sandalwood",
    description:
      "Luminous jasmine layered over warm tonka bean and creamy sandalwood. Formulated as an evening room and linen spray that lingers softly without overpowering.",
    scentNotes: { top: ["Night Jasmine"], heart: ["Tonka Bean"], base: ["Sandalwood"] },
    finish: "Fine mist spray bottle",
    safetyInfo:
      "Test delicately on delicate fabrics first. Store upright in a cool place out of direct sunlight.",
    pairsWithSlugs: ["gbagada-dusk", "amber-hush"],
  },
  {
    slug: "arch-tray",
    name: "Arch Tray",
    categorySlug: "gypsum-decor",
    categoryLabel: "Gypsum Decor",
    spaceSlugs: ["living-room", "entryway", "bedroom"],
    price: 21000,
    stock: 8,
    sku: "LG-ARCH-TRAY-STD",
    image: "/products/p-gypsum.jpg",
    sortOrder: 7,
    notesLine: "Hand-poured gypsum",
    description:
      "A sculptural arch tray cast in mineral gypsum, hand-sanded to a velvety matte finish, and sealed against water and candle wax in our Gbagada workbench.",
    scentNotes: { top: [], heart: [], base: [] },
    finish: "Hand-poured sealed mineral gypsum",
    safetyInfo:
      "Wipe clean with a soft damp cloth and dry immediately. Avoid abrasive cleaners or prolonged soaking.",
    pairsWithSlugs: ["amber-hush", "saffron-reed"],
  },
  {
    slug: "curve-vase",
    name: "Curve Vase",
    categorySlug: "gypsum-decor",
    categoryLabel: "Gypsum Decor",
    spaceSlugs: ["living-room", "entryway", "events"],
    price: 19500,
    stock: 6,
    sku: "LG-CURVE-VASE-STD",
    image: "/products/p-gypsum.jpg",
    sortOrder: 8,
    notesLine: "Matte gypsum · Ivory",
    description:
      "A minimalist matte ivory gypsum vase sculpted with soft architectural curves, hand-sanded and sealed for dried florals, sculptural shelf styling, and gifting.",
    scentNotes: { top: [], heart: [], base: [] },
    finish: "Matte ivory sealed mineral gypsum",
    safetyInfo:
      "Best styled with dried or preserved stems. Wipe gently with a damp cloth; do not submerge in water.",
    pairsWithSlugs: ["linen-morning", "soft-veil"],
  },
];

const DELIVERY_ZONES = [
  { name: "Ikeja", fee: 2000, etaText: "2–3 working days", active: true, sortOrder: 1 },
  { name: "Surulere", fee: 2000, etaText: "2–3 working days", active: true, sortOrder: 2 },
  { name: "Lekki", fee: 3000, etaText: "2–3 working days", active: true, sortOrder: 3 },
  { name: "Victoria Island", fee: 4000, etaText: "2–3 working days", active: true, sortOrder: 4 },
];

const CONTENT_PAGES = [
  {
    slug: "our-story",
    title: "Our Story",
    sections: [
      {
        heading: "Rooted in Gbagada, Lagos",
        body: "Ligera was founded to illuminate every space with thoughtful home fragrance and sculptural objects. From our studio at 43 Onabola Street, Pedro Road, Gbagada, Lagos, every scented candle, reed diffuser, room & linen spray, and mineral gypsum piece is composed, poured, hand-finished, and inspected in small batches.",
        image: null,
      },
      {
        heading: "Quiet Luxury & Considered Materials",
        body: "We pair clean-burning wax and hand-trimmed cotton wicks with layered fine fragrance oils and sealed mineral gypsum vessels. Whether lighting a candle after dusk or styling a gifting bundle, each detail is made to turn everyday routines into unhurried rituals.",
        image: null,
      },
    ],
    seo: {
      title: "Our Story — Lagos Home Fragrance Studio | Ligera",
      metaDescription:
        "Discover Ligera, the Lagos home fragrance studio in Gbagada crafting hand-poured scented candles, reed diffusers, room sprays, and sculpted gypsum decor.",
    },
  },
  {
    slug: "faqs",
    title: "Frequently Asked Questions",
    sections: [
      {
        heading: "Where is Ligera located and can I pick up orders in person?",
        body: "Our studio is located at 43 Onabola Street, Pedro Road, Gbagada, Lagos. We are open Monday to Saturday from 9:00 AM to 6:00 PM WAT, and Gbagada studio pickup is available for ready and custom orders—call or message us on WhatsApp at 0809 661 3114 to coordinate pickup.",
        image: null,
      },
      {
        heading: "Do you deliver outside Lagos or nationwide in Nigeria?",
        body: "Yes. Delivery is prioritized across Lagos neighborhoods (including Gbagada, Ikeja, Surulere, Lekki, and Victoria Island within 2–3 working days) and we also ship nationwide across Nigeria, including Abuja and Port Harcourt.",
        image: null,
      },
      {
        heading: "How long does Lagos delivery take?",
        body: "Lagos zone deliveries typically arrive in 2–3 working days across Ikeja, Surulere, Lekki, Victoria Island, and surrounding neighborhoods.",
        image: null,
      },
      {
        heading: "Do you make custom candles, wedding favors, or corporate gifts?",
        body: "Yes. Our Gbagada studio crafts bespoke scented candles, reed diffusers, room and linen sprays, and sculpted gypsum trays/vessels with custom scents, labels, and vessel finishes for weddings, corporate gifting, and short-let residences. Submit a request on our Custom Orders page to chat directly on WhatsApp.",
        image: null,
      },
      {
        heading: "How do I care for a Ligera scented candle for an even burn?",
        body: "Trim the cotton wick to about 5mm before each lighting, let the wax pool reach the edge of the vessel on your first burn to avoid tunneling, burn for no longer than 3–4 hours at a time, and keep candles away from drafts and flammable objects.",
        image: null,
      },
      {
        heading: "How should I care for Ligera gypsum trays and vases?",
        body: "Every Ligera gypsum piece is hand-sanded and sealed against water and wax. Wipe gently with a soft dry or slightly damp cloth, avoid harsh abrasive cleaners or soaking in water, and keep sealed pieces out of prolonged standing moisture.",
        image: null,
      },
      {
        heading: "How do I pay for my order?",
        body: "Online orders are paid securely via Flutterwave using card or bank transfer during checkout. For bespoke bulk orders, our studio provides a tailored quote via WhatsApp at 0809 661 3114.",
        image: null,
      },
    ],
    seo: {
      title: "FAQs — Candles, Lagos Delivery & Studio Pickup | Ligera",
      metaDescription:
        "Answers about Ligera scented candles, reed diffusers, room sprays, gypsum decor, Lagos & nationwide Nigeria delivery, Gbagada pickup, and custom orders.",
    },
  },
  {
    slug: "delivery-returns",
    title: "Delivery & Returns",
    sections: [
      {
        heading: "Lagos Delivery & Studio Pickup",
        body: "Orders within Lagos are dispatched by delivery zone (including Ikeja, Surulere, Lekki, and Victoria Island) and typically arrive within 2–3 working days. Studio pickup is also available at 43 Onabola Street, Pedro Road, Gbagada, Lagos during opening hours (Mon–Sat, 9am–6pm WAT).",
        image: null,
      },
      {
        heading: "Nationwide Nigeria Shipping & Returns",
        body: "We carefully package glass vessels and mineral gypsum for interstate dispatch across Nigeria. Unused, unopened items may be inspected for return or exchange at our Gbagada studio, and transit damage reported within 48 hours on 0809 661 3114 qualifies for replacement.",
        image: null,
      },
    ],
    seo: {
      title: "Lagos Delivery, Nigeria Shipping & Studio Pickup | Ligera",
      metaDescription:
        "View Ligera Lagos delivery zones and timelines, nationwide Nigeria shipping, Gbagada studio pickup hours, and returns policy.",
    },
  },
  {
    slug: "returns",
    title: "Returns & Refunds",
    sections: [
      {
        heading: "Damaged or Incorrect Items",
        body: "If an order arrives damaged in transit or with an incorrect item, contact us within 48 hours of delivery on 0809 661 3114 (WhatsApp or phone) with photos of the package and item so our studio can arrange a replacement or resolution.",
        image: null,
      },
      {
        heading: "Unopened Returns & Custom Orders",
        body: "Unused, unopened items in their original packaging may be eligible for return or exchange subject to inspection at our Gbagada studio. Because bespoke and custom-labeled orders are handcrafted specifically for your occasion, custom orders are non-returnable once production begins unless damaged or faulty on arrival.",
        image: null,
      },
    ],
    seo: {
      title: "Returns & Refunds Policy | Ligera",
      metaDescription: "Returns, replacements, and refund policy for Ligera home fragrance and custom orders.",
    },
  },
  {
    slug: "candle-safety",
    title: "Candle Safety & Care",
    sections: [
      {
        heading: "Trim Your Wick Before Every Burn",
        body: "Before lighting your candle, trim the cotton wick to roughly 5mm. This prevents soot, keeps the flame steady, and helps your candle burn cleanly and evenly.",
        image: null,
      },
      {
        heading: "Set the Memory Ring on the First Burn",
        body: "Allow the melted wax pool to reach across the full surface of the vessel on your first burn (usually 2 to 3 hours) so the candle does not tunnel on future uses. Do not burn for more than 4 hours at a time.",
        image: null,
      },
      {
        heading: "Safe Placement & Extinguishing",
        body: "Always burn candles on a heat-resistant surface—such as a Ligera sealed gypsum tray—away from drafts, curtains, children, and pets. Never leave a burning candle unattended, and stop burning when about 1cm of wax remains.",
        image: null,
      },
      {
        heading: "Reed Diffuser & Room Spray Care",
        body: "Flip reed diffuser sticks every 5 to 7 days to refresh fragrance throw, and wipe spills immediately on polished or wooden surfaces. Shake room and linen sprays gently and mist into open air or onto linens from about 30cm away.",
        image: null,
      },
      {
        heading: "Gypsum Decor Care",
        body: "Ligera gypsum trays and vases are cast, hand-sanded, and sealed against water and wax. Clean with a soft damp cloth and mild soap if needed, wipe dry, and avoid soaking or abrasive scrubbers.",
        image: null,
      },
    ],
    seo: {
      title: "Candle Safety & Care Guide | Ligera",
      metaDescription:
        "Learn how to burn scented candles safely and care for Ligera reed diffusers, room sprays, and mineral gypsum decor.",
    },
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    sections: [
      {
        heading: "Privacy Notice (NDPA 2023)",
        body: "Ligera is committed to protecting your personal data in accordance with the Nigeria Data Protection Act 2023 (NDPA 2023). We collect only the contact, delivery, and order information necessary to process purchases, coordinate Lagos or nationwide delivery and studio pickup, and respond to custom order inquiries.",
        image: null,
      },
      {
        heading: "How We Use & Protect Your Data",
        body: "Your name, phone number, email address, and delivery address are used strictly to fulfill orders, verify payments through Flutterwave, send order status notifications, and communicate via WhatsApp or phone when arranging delivery or pickup.",
        image: null,
      },
      {
        heading: "Your Rights",
        body: "Under NDPA 2023, you have the right to request access to, correction of, or deletion of your personal data, and to restrict or object to certain processing. Contact our studio on 0809 661 3114 for privacy requests.",
        image: null,
      },
    ],
    seo: {
      title: "Privacy Policy (NDPA 2023) | Ligera",
      metaDescription: "Ligera privacy notice and data protection commitments under the Nigeria Data Protection Act 2023.",
    },
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    sections: [
      {
        heading: "Using Ligera",
        body: "By browsing ligerascents.com or placing an order with Ligera (43 Onabola Street, Pedro Road, Gbagada, Lagos), you agree to these terms of service.",
        image: null,
      },
      {
        heading: "Orders, Pricing & Payment",
        body: "All prices on ligerascents.com are listed in Nigerian Naira (₦). Orders are confirmed once payment completes via Flutterwave or bank transfer. Custom orders confirmed through our studio follow the agreed quote and production schedule.",
        image: null,
      },
      {
        heading: "Delivery & Studio Pickup",
        body: "We deliver across Lagos (typically 2–3 working days per delivery zone) and ship nationwide across Nigeria. Pickup is available from our Gbagada studio during opening hours (Monday–Saturday, 9:00 AM – 6:00 PM WAT).",
        image: null,
      },
    ],
    seo: {
      title: "Terms & Conditions | Ligera",
      metaDescription: "Terms of service, pricing, payment, delivery, and studio pickup terms for Ligera.",
    },
  },
];

function loadEnvIfNeeded() {
  if (process.env.MONGODB_URI) return;
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(scriptDir, "../.env"),
  ];
  const envPath = candidates.find((p) => fs.existsSync(p));
  if (!envPath) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function safeCreateIndex(collection, keys, options = {}) {
  try {
    await collection.createIndex(keys, options);
  } catch (err) {
    // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict
    if (err?.code === 85 || err?.code === 86 || err?.codeName === "IndexOptionsConflict" || err?.codeName === "IndexKeySpecsConflict") {
      return;
    }
    throw err;
  }
}

async function ensureCollectionsAndIndexes(db) {
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  for (const name of COLLECTION_NAMES) {
    if (!existing.has(name)) {
      try {
        await db.createCollection(name);
      } catch (err) {
        if (err?.code !== 48 && err?.codeName !== "NamespaceExists") {
          throw err;
        }
      }
    }
  }

  const categories = db.collection("categories");
  await safeCreateIndex(categories, { slug: 1 }, { unique: true });
  await safeCreateIndex(categories, { type: 1 });
  await safeCreateIndex(categories, { type: 1, sortOrder: 1 });

  const products = db.collection("products");
  await safeCreateIndex(products, { slug: 1 }, { unique: true });
  await safeCreateIndex(products, { status: 1 });
  await safeCreateIndex(products, { status: 1, categoryId: 1, sortOrder: 1 });
  await safeCreateIndex(products, { status: 1, createdAt: -1 });
  await safeCreateIndex(products, { status: 1, minPrice: 1 });
  await safeCreateIndex(products, { spaceTagIds: 1, status: 1 });
  await safeCreateIndex(
    products,
    { name: "text", description: "text", "scentNotes.top": "text", "scentNotes.heart": "text", "scentNotes.base": "text" },
    { weights: { name: 10, description: 3, "scentNotes.top": 5, "scentNotes.heart": 5, "scentNotes.base": 5 } },
  );

  const variants = db.collection("variants");
  await safeCreateIndex(variants, { sku: 1 }, { unique: true });
  await safeCreateIndex(variants, { productId: 1 });
  await safeCreateIndex(variants, { productId: 1, active: 1 });

  const deliveryzones = db.collection("deliveryzones");
  await safeCreateIndex(deliveryzones, { active: 1, sortOrder: 1 });
  await safeCreateIndex(deliveryzones, { name: 1 }, { unique: true });

  const contentpages = db.collection("contentpages");
  await safeCreateIndex(contentpages, { slug: 1 }, { unique: true });

  const users = db.collection("users");
  await safeCreateIndex(users, { email: 1 }, { unique: true });

  const orders = db.collection("orders");
  await safeCreateIndex(orders, { orderNumber: 1 });
  await safeCreateIndex(orders, { status: 1 });
  await safeCreateIndex(orders, { status: 1, paidAt: 1 });
  await safeCreateIndex(orders, { "items.productId": 1, status: 1 });
  await safeCreateIndex(orders, { externalRef: 1 });
  await safeCreateIndex(orders, { createdAt: -1 });
  await safeCreateIndex(orders, { "customer.email": 1 });

  const payments = db.collection("payments");
  await safeCreateIndex(payments, { orderId: 1 });
  await safeCreateIndex(payments, { reference: 1 });
  await safeCreateIndex(payments, { status: 1 });

  const customers = db.collection("customers");
  await safeCreateIndex(customers, { email: 1 }, { unique: true });

  const customrequests = db.collection("customrequests");
  await safeCreateIndex(customrequests, { requestNumber: 1 }, { unique: true });
  await safeCreateIndex(customrequests, { status: 1 });
  await safeCreateIndex(customrequests, { status: 1, createdAt: -1 });
  await safeCreateIndex(customrequests, { "contact.email": 1 });
  await safeCreateIndex(customrequests, { "paymentLink.txRef": 1 });

  const notificationlogs = db.collection("notificationlogs");
  await safeCreateIndex(notificationlogs, { dedupeKey: 1 }, { unique: true });
  await safeCreateIndex(notificationlogs, { orderId: 1 });
  await safeCreateIndex(notificationlogs, { customRequestId: 1 });
  await safeCreateIndex(notificationlogs, { status: 1 });
  await safeCreateIndex(notificationlogs, { status: 1, nextAttemptAt: 1 });
  await safeCreateIndex(notificationlogs, { orderId: 1, createdAt: -1 });
  await safeCreateIndex(notificationlogs, { createdAt: -1 });

  const stockadjustments = db.collection("stockadjustments");
  await safeCreateIndex(stockadjustments, { variantId: 1 });
  await safeCreateIndex(stockadjustments, { productId: 1 });
  await safeCreateIndex(stockadjustments, { createdAt: -1 });

  const activitylogs = db.collection("activitylogs");
  await safeCreateIndex(activitylogs, { userId: 1 });
  await safeCreateIndex(activitylogs, { createdAt: -1 });
  await safeCreateIndex(activitylogs, { "entity.type": 1, "entity.id": 1 });
}

async function seedTaxonomy(db) {
  const categoriesCol = db.collection("categories");
  const now = new Date();

  for (const item of [...TAXONOMY_CATEGORIES, ...TAXONOMY_SPACES]) {
    await categoriesCol.updateOne(
      { slug: item.slug },
      {
        $setOnInsert: {
          name: item.name,
          slug: item.slug,
          type: item.type,
          parentId: null,
          description: item.description,
          image: item.image,
          active: item.active,
          sortOrder: item.sortOrder,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  const allDocs = await categoriesCol.find({}).toArray();
  const bySlug = new Map(allDocs.map((d) => [d.slug, d]));
  return bySlug;
}

async function seedProductsAndVariants(db, categoryBySlug) {
  const productsCol = db.collection("products");
  const variantsCol = db.collection("variants");
  const now = new Date();

  for (const p of PRODUCTS) {
    const categoryDoc = categoryBySlug.get(p.categorySlug);
    if (!categoryDoc) {
      throw new Error(`Missing category document for slug "${p.categorySlug}"`);
    }
    const spaceTagIds = p.spaceSlugs
      .map((s) => categoryBySlug.get(s)?._id)
      .filter(Boolean);

    const seoTitle = `${p.name} — ${p.categoryLabel} in Lagos`;
    const seoDescription = `Buy ${p.name} (${p.notesLine}) from Ligera in Lagos for ₦${p.price.toLocaleString("en-NG")}. Handcrafted in Gbagada with Lagos delivery, studio pickup, and nationwide Nigeria shipping.`;

    await productsCol.updateOne(
      { slug: p.slug },
      {
        $setOnInsert: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          categoryId: categoryDoc._id,
          spaceTagIds,
          scentNotes: p.scentNotes,
          ingredients: "",
          safetyInfo: p.safetyInfo,
          burnTime: "",
          dimensions: "",
          finish: p.finish,
          madeToOrder: false,
          leadTimeDays: 0,
          status: "published",
          images: [
            {
              _id: new mongoose.Types.ObjectId(),
              publicId: p.image,
              alt: `${p.name} — ${p.categoryLabel} by Ligera`,
              width: 900,
              height: 900,
              position: 0,
            },
          ],
          pairsWith: [],
          seo: {
            title: seoTitle,
            metaDescription: seoDescription,
            ogImage: p.image,
          },
          popularity: 0,
          featured: true,
          sortOrder: p.sortOrder,
          externalRef: null,
          minPrice: p.price,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  const productDocs = await productsCol.find({ slug: { $in: PRODUCTS.map((p) => p.slug) } }).toArray();
  const productBySlug = new Map(productDocs.map((d) => [d.slug, d]));

  // Link cross-sell pairsWith only when pairsWith is empty or missing
  for (const p of PRODUCTS) {
    const current = productBySlug.get(p.slug);
    if (!current) continue;
    const pairIds = p.pairsWithSlugs
      .map((slug) => productBySlug.get(slug)?._id)
      .filter(Boolean);
    if (pairIds.length > 0) {
      await productsCol.updateOne(
        {
          _id: current._id,
          $or: [{ pairsWith: { $exists: false } }, { pairsWith: { $size: 0 } }],
        },
        { $set: { pairsWith: pairIds, updatedAt: new Date() } },
      );
    }
  }

  // Upsert default variant per product
  for (const p of PRODUCTS) {
    const productDoc = productBySlug.get(p.slug);
    if (!productDoc) continue;
    await variantsCol.updateOne(
      { sku: p.sku },
      {
        $setOnInsert: {
          productId: productDoc._id,
          label: "Standard",
          name: "Standard",
          sku: p.sku,
          price: p.price,
          salePrice: null,
          stockQty: p.stock,
          stock: p.stock,
          heldQty: 0,
          lowStockThreshold: 5,
          costPrice: 0,
          active: true,
          madeToOrder: false,
          leadTimeDays: 0,
          externalRef: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
}

async function seedDeliveryZones(db) {
  const zonesCol = db.collection("deliveryzones");
  const now = new Date();
  for (const z of DELIVERY_ZONES) {
    await zonesCol.updateOne(
      { name: z.name },
      {
        $setOnInsert: {
          name: z.name,
          fee: z.fee,
          etaText: z.etaText,
          active: z.active,
          sortOrder: z.sortOrder,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
}

async function seedSettings(db, categoryBySlug) {
  const settingsCol = db.collection("settings");
  const count = await settingsCol.countDocuments();
  if (count > 0) return;

  const featuredCollectionIds = [
    "scented-candles",
    "reed-diffusers",
    "room-linen-sprays",
    "gypsum-decor",
  ]
    .map((slug) => categoryBySlug.get(slug)?._id?.toString())
    .filter(Boolean);

  const now = new Date();
  await settingsCol.insertOne({
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
      featuredCollectionIds,
      instagramPosts: [],
      newsletterEnabled: true,
    },
    seo: {
      defaultTitle: "Ligera — Luxury Scented Candles, Reed Diffusers & Gypsum Decor in Lagos",
      defaultDescription:
        "Lagos home fragrance house in Gbagada crafting hand-poured scented candles, reed diffusers, room & linen sprays, and sculpted gypsum decor.",
    },
    emailTemplates: {},
    createdAt: now,
    updatedAt: now,
  });
}

async function seedContentPages(db) {
  const pagesCol = db.collection("contentpages");
  const now = new Date();
  for (const page of CONTENT_PAGES) {
    await pagesCol.updateOne(
      { slug: page.slug },
      {
        $setOnInsert: {
          slug: page.slug,
          title: page.title,
          sections: page.sections,
          seo: page.seo,
          updatedBy: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
}

async function seedCounters(db) {
  const countersCol = db.collection("counters");
  for (const key of ["order", "custom_request"]) {
    await countersCol.updateOne(
      { _id: key },
      { $setOnInsert: { seq: 0 } },
      { upsert: true },
    );
  }
}

async function maybeSeedOwner(db) {
  const usersCol = db.collection("users");
  const email = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD || "";
  const name = (process.env.OWNER_NAME || "Owner").trim();

  if (email && password.length >= 8) {
    const existing = await usersCol.findOne({ email });
    if (!existing) {
      const now = new Date();
      const passwordHash = await bcrypt.hash(password, 12);
      await usersCol.insertOne({
        name,
        email,
        passwordHash,
        role: "owner",
        twoFactorEnabled: false,
        twoFactorSecretEncrypted: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        resetTokenHash: null,
        resetExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Seeded owner user from environment (${email}).`);
    }
  }
}

async function run() {
  loadEnvIfNeeded();
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is required (set in environment or web/.env).");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "ligera",
    serverSelectionTimeoutMS: 10000,
  });

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection database handle unavailable.");

    await ensureCollectionsAndIndexes(db);
    const categoryBySlug = await seedTaxonomy(db);
    await seedProductsAndVariants(db, categoryBySlug);
    await seedDeliveryZones(db);
    await seedSettings(db, categoryBySlug);
    await seedContentPages(db);
    await seedCounters(db);
    await maybeSeedOwner(db);

    console.log(`Database "${db.databaseName}" schema & seed complete:`);
    for (const name of COLLECTION_NAMES) {
      const count = await db.collection(name).countDocuments();
      console.log(`  - ${name}: ${count}`);
    }

    const userCount = await db.collection("users").countDocuments();
    if (userCount === 0) {
      console.log(
        "\nReminder: No admin users exist yet. Run: npm run admin:seed -- --email=<you@domain.com> --password=<your-password>",
      );
    }
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

run().catch((err) => {
  console.error("Database seed failed:", err?.message || err);
  process.exit(1);
});
