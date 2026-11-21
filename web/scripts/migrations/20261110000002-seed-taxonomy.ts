import mongoose from "mongoose";
import { connectDb } from "../src/lib/db/connect";
import { Category } from "../src/lib/db/models/category";

const categories = [
  { name: "Scented Candles", slug: "scented-candles", type: "category" as const, sortOrder: 1 },
  { name: "Reed Diffusers", slug: "reed-diffusers", type: "category" as const, sortOrder: 2 },
  { name: "Room & Linen Sprays", slug: "room-linen-sprays", type: "category" as const, sortOrder: 3 },
  { name: "Gypsum Decor", slug: "gypsum-decor", type: "category" as const, sortOrder: 4 },
  { name: "Gift Sets & Bundles", slug: "gift-sets-bundles", type: "category" as const, sortOrder: 5 },
  { name: "Custom & Bespoke", slug: "custom-bespoke", type: "category" as const, sortOrder: 6 },
];

const spaces = [
  { name: "Bedroom", slug: "bedroom", type: "space" as const, sortOrder: 1 },
  { name: "Living Room", slug: "living-room", type: "space" as const, sortOrder: 2 },
  { name: "Bathroom", slug: "bathroom", type: "space" as const, sortOrder: 3 },
  { name: "Kitchen", slug: "kitchen", type: "space" as const, sortOrder: 4 },
  { name: "Office", slug: "office", type: "space" as const, sortOrder: 5 },
  { name: "Entryway", slug: "entryway", type: "space" as const, sortOrder: 6 },
  { name: "Events", slug: "events", type: "space" as const, sortOrder: 7 },
];

export async function up() {
  await connectDb();
  for (const cat of [...categories, ...spaces]) {
    await Category.updateOne({ slug: cat.slug }, { $setOnInsert: cat }, { upsert: true });
  }
  console.log("Taxonomy seeded");
}

export async function down() {
  await connectDb();
  const slugs = [...categories, ...spaces].map((c) => c.slug);
  await Category.deleteMany({ slug: { $in: slugs } });
  console.log("Taxonomy removed");
}

if (require.main === module) {
  up().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
