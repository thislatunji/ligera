export interface FaqEntry {
  question: string;
  answer: string;
}

export interface ContentSectionDefault {
  heading: string;
  body: string;
}

export interface DeliveryZoneDefault {
  id: string;
  name: string;
  fee: number;
  etaText: string;
}

export interface FallbackProductDetail {
  description: string;
  scentNotes: { top: string[]; heart: string[]; base: string[] };
  finish: string;
  safetyInfo: string;
}

export const DEFAULT_DELIVERY_ZONES: DeliveryZoneDefault[] = [
  { id: "ikeja", name: "Ikeja", fee: 2000, etaText: "2–3 working days" },
  { id: "surulere", name: "Surulere", fee: 2000, etaText: "2–3 working days" },
  { id: "lekki", name: "Lekki", fee: 3000, etaText: "2–3 working days" },
  { id: "victoria-island", name: "Victoria Island", fee: 4000, etaText: "2–3 working days" },
];

export const DEFAULT_FAQS: FaqEntry[] = [
  {
    question: "Where is Ligera located and can I pick up orders in person?",
    answer:
      "Our studio is located at 43 Onabola Street, Pedro Road, Gbagada, Lagos. We are open Monday to Saturday from 9:00 AM to 6:00 PM WAT, and Gbagada studio pickup is available for ready and custom orders—call or message us on WhatsApp at 0809 661 3114 to coordinate pickup.",
  },
  {
    question: "Do you deliver outside Lagos or nationwide in Nigeria?",
    answer:
      "Yes. Delivery is prioritized across Lagos neighborhoods (including Gbagada, Ikeja, Surulere, Lekki, and Victoria Island within 2–3 working days) and we also ship nationwide across Nigeria, including Abuja and Port Harcourt.",
  },
  {
    question: "How long does Lagos delivery take and what are the fees?",
    answer:
      "Lagos zone deliveries typically arrive in 2–3 working days. Standard Lagos zone fees start at ₦2,000 for Ikeja and Surulere, ₦3,000 for Lekki, and ₦4,000 for Victoria Island. Exact rates are shown at checkout.",
  },
  {
    question: "Do you make custom candles, wedding favors, or corporate gifts?",
    answer:
      "Yes. Our Gbagada studio crafts bespoke scented candles, reed diffusers, room and linen sprays, and sculpted gypsum trays/vessels with custom scents, labels, and vessel finishes for weddings, corporate gifting, and short-let residences. Submit a request on our Custom Orders page to chat directly on WhatsApp.",
  },
  {
    question: "How do I care for a Ligera scented candle for an even burn?",
    answer:
      "Trim the cotton wick to about 5mm before each lighting, let the wax pool reach the edge of the vessel on your first burn to avoid tunneling, burn for no longer than 3–4 hours at a time, and keep candles away from drafts and flammable objects.",
  },
  {
    question: "How should I care for Ligera gypsum trays and vases?",
    answer:
      "Every Ligera gypsum piece is hand-sanded and sealed against water and wax. Wipe gently with a soft dry or slightly damp cloth, avoid harsh abrasive cleaners or soaking in water, and keep sealed pieces out of prolonged standing moisture.",
  },
  {
    question: "How do I pay for my order?",
    answer:
      "Online orders are paid securely via Flutterwave using card or bank transfer during checkout. For bespoke bulk orders, our studio provides a tailored quote via WhatsApp at 0809 661 3114.",
  },
];

export const DEFAULT_CUSTOM_ORDER_FAQS: FaqEntry[] = [
  {
    question: "What product families can be customized?",
    answer:
      "You can request custom orders for Scented Candles, Reed Diffusers, Room & Linen Sprays, Gypsum Decor (trays, ribbed vessels, and curve vases), or Curated Bundles pairing multiple families.",
  },
  {
    question: "What occasions do you handle custom orders for?",
    answer:
      "We prepare bespoke orders for weddings and bridal favors, corporate and client gifting, housewarmings, and signature scenting for short-let and boutique hospitality apartments in Lagos and across Nigeria.",
  },
  {
    question: "How do pricing and timelines work for bespoke requests?",
    answer:
      "Because custom orders vary by quantity, vessel finish, custom labels, and scent blend, you submit your details through our Custom Order form to open a direct WhatsApp consultation with our Gbagada studio for exact pricing, production timelines, and Lagos pickup or nationwide delivery.",
  },
];

export const DEFAULT_CANDLE_SAFETY_SECTIONS: ContentSectionDefault[] = [
  {
    heading: "Trim Your Wick Before Every Burn",
    body: "Before lighting your candle, trim the cotton wick to roughly 5mm. This prevents soot, keeps the flame steady, and helps your candle burn cleanly and evenly.",
  },
  {
    heading: "Set the Memory Ring on the First Burn",
    body: "Allow the melted wax pool to reach across the full surface of the vessel on your first burn (usually 2 to 3 hours) so the candle does not tunnel on future uses. Do not burn for more than 4 hours at a time.",
  },
  {
    heading: "Safe Placement & Extinguishing",
    body: "Always burn candles on a heat-resistant surface—such as a Ligera sealed gypsum tray—away from drafts, curtains, children, and pets. Never leave a burning candle unattended, and stop burning when about 1cm of wax remains.",
  },
  {
    heading: "Reed Diffuser & Room Spray Care",
    body: "Flip reed diffuser sticks every 5 to 7 days to refresh fragrance throw, and wipe spills immediately on polished or wooden surfaces. Shake room and linen sprays gently and mist into open air or onto linens from about 30cm away.",
  },
  {
    heading: "Gypsum Decor Care",
    body: "Ligera gypsum trays and vases are cast, hand-sanded, and sealed against water and wax. Clean with a soft damp cloth and mild soap if needed, wipe dry, and avoid soaking or abrasive scrubbers.",
  },
];

export const DEFAULT_PRIVACY_SECTIONS: ContentSectionDefault[] = [
  {
    heading: "Privacy Notice (NDPA 2023)",
    body: "Ligera is committed to protecting your personal data in accordance with the Nigeria Data Protection Act 2023 (NDPA 2023). We collect only the contact, delivery, and order information necessary to process purchases, coordinate Lagos or nationwide delivery and studio pickup, and respond to custom order inquiries.",
  },
  {
    heading: "How We Use & Protect Your Data",
    body: "Your name, phone number, email address, and delivery address are used strictly to fulfill orders, verify payments through Flutterwave, send order status notifications, and communicate via WhatsApp or phone when arranging delivery or pickup.",
  },
  {
    heading: "Your Rights",
    body: "Under NDPA 2023, you have the right to request access to, correction of, or deletion of your personal data, and to restrict or object to certain processing. Contact our studio on 0809 661 3114 for privacy requests.",
  },
];

export const DEFAULT_TERMS_SECTIONS: ContentSectionDefault[] = [
  {
    heading: "Using Ligera",
    body: "By browsing ligerascents.com or placing an order with Ligera (43 Onabola Street, Pedro Road, Gbagada, Lagos), you agree to these terms of service.",
  },
  {
    heading: "Orders, Pricing & Payment",
    body: "All prices on ligerascents.com are listed in Nigerian Naira (₦). Orders are confirmed once payment completes via Flutterwave or bank transfer. Custom orders confirmed through our studio follow the agreed quote and production schedule.",
  },
  {
    heading: "Delivery & Studio Pickup",
    body: "We deliver across Lagos (typically 2–3 working days per delivery zone) and ship nationwide across Nigeria. Pickup is available from our Gbagada studio during opening hours (Monday–Saturday, 9:00 AM – 6:00 PM WAT).",
  },
];

export const DEFAULT_RETURNS_SECTIONS: ContentSectionDefault[] = [
  {
    heading: "Damaged or Incorrect Items",
    body: "If an order arrives damaged in transit or with an incorrect item, contact us within 48 hours of delivery on 0809 661 3114 (WhatsApp or phone) with photos of the package and item so our studio can arrange a replacement or resolution.",
  },
  {
    heading: "Unopened Returns & Custom Orders",
    body: "Unused, unopened items in their original packaging may be eligible for return or exchange subject to inspection at our Gbagada studio. Because bespoke and custom-labeled orders are handcrafted specifically for your occasion, custom orders are non-returnable once production begins unless damaged or faulty on arrival.",
  },
];

export const FALLBACK_PRODUCT_DETAILS: Record<string, FallbackProductDetail> = {
  "amber-hush": {
    description:
      "A warm, grounding hand-poured scented candle layering golden amber, creamy vanilla, and smooth cedarwood. Poured in small batches in Gbagada, Lagos with a hand-trimmed cotton wick for a clean, steady glow.",
    scentNotes: {
      top: ["Warm Amber"],
      heart: ["Creamy Vanilla"],
      base: ["Cedarwood"],
    },
    finish: "Hand-poured wax · Cotton wick",
    safetyInfo:
      "Trim wick to 5mm before lighting. Burn on a heat-safe surface away from drafts for up to 4 hours per session.",
  },
  "linen-morning": {
    description:
      "Crisp cotton, airy white tea, and soft skin musk come together in a calm, sunlit candle designed for bedrooms, bathrooms, and slow weekend mornings.",
    scentNotes: {
      top: ["Fresh Cotton"],
      heart: ["White Tea"],
      base: ["Soft Musk"],
    },
    finish: "Hand-poured wax · Cotton wick",
    safetyInfo:
      "Trim wick to 5mm before each burn and allow the wax pool to reach the jar edge on the first lighting.",
  },
  "saffron-reed": {
    description:
      "An opulent, flameless reed diffuser blending spiced saffron, smoky oud, and ripe fig. Formulated in our Lagos studio for continuous scent diffusion in living rooms, foyers, and short-let residences.",
    scentNotes: {
      top: ["Saffron"],
      heart: ["Ripe Fig"],
      base: ["Oud"],
    },
    finish: "Glass vessel · Natural reeds",
    safetyInfo:
      "Keep upright away from open flames and direct heat. Flip reeds periodically to refresh throw and wipe spills immediately.",
  },
  "gbagada-dusk": {
    description:
      "Named after our Lagos studio home, Gbagada Dusk pairs bright neroli blossom with resinous amberwood and subtle evening smoke for an understated, atmospheric reed diffuser.",
    scentNotes: {
      top: ["Neroli"],
      heart: ["Amberwood"],
      base: ["Warm Smoke"],
    },
    finish: "Glass vessel · Natural reeds",
    safetyInfo:
      "Place on a stable surface or tray away from children and pets. Wash hands after flipping diffuser reeds.",
  },
  "soft-veil": {
    description:
      "A fine room and linen mist uniting delicate peony petals, bright bergamot, and comforting cashmere—ideal for refreshing freshly laundered bedding, curtains, and living areas.",
    scentNotes: {
      top: ["Bergamot"],
      heart: ["Peony"],
      base: ["Cashmere"],
    },
    finish: "Fine mist spray bottle",
    safetyInfo:
      "Mist into open air or lightly onto linens from 30cm away. Keep away from eyes and open flames.",
  },
  "night-bloom": {
    description:
      "Luminous jasmine layered over warm tonka bean and creamy sandalwood. Formulated as an evening room and linen spray that lingers softly without overpowering.",
    scentNotes: {
      top: ["Night Jasmine"],
      heart: ["Tonka Bean"],
      base: ["Sandalwood"],
    },
    finish: "Fine mist spray bottle",
    safetyInfo:
      "Test delicately on delicate fabrics first. Store upright in a cool place out of direct sunlight.",
  },
  "arch-tray": {
    description:
      "A sculptural arch tray cast in mineral gypsum, hand-sanded to a velvety matte finish, and sealed against water and candle wax in our Gbagada workbench.",
    scentNotes: { top: [], heart: [], base: [] },
    finish: "Hand-poured sealed mineral gypsum",
    safetyInfo:
      "Wipe clean with a soft damp cloth and dry immediately. Avoid abrasive cleaners or prolonged soaking.",
  },
  "curve-vase": {
    description:
      "A minimalist matte ivory gypsum vase sculpted with soft architectural curves, hand-sanded and sealed for dried florals, sculptural shelf styling, and gifting.",
    scentNotes: { top: [], heart: [], base: [] },
    finish: "Matte ivory sealed mineral gypsum",
    safetyInfo:
      "Best styled with dried or preserved stems. Wipe gently with a damp cloth; do not submerge in water.",
  },
};
