import mongoose from "mongoose";
import { connectDb } from "../src/lib/db/connect";

export async function up() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("db not available");

  // Create collections if they don't exist
  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  if (!names.includes("products")) await db.createCollection("products");
  if (!names.includes("variants")) await db.createCollection("variants");
  if (!names.includes("categories")) await db.createCollection("categories");
  if (!names.includes("stock_adjustments")) await db.createCollection("stock_adjustments");

  // Indexes
  await db.collection("products").createIndex({ slug: 1 }, { unique: true });
  await db.collection("products").createIndex({ status: 1, categoryId: 1, sortOrder: 1 });
  await db.collection("products").createIndex({ status: 1, createdAt: -1 });
  await db.collection("products").createIndex({ status: 1, minPrice: 1 });
  await db.collection("products").createIndex({ spaceTagIds: 1, status: 1 });
  await db
    .collection("products")
    .createIndex(
      { name: "text", description: "text", "scentNotes.top": "text", "scentNotes.heart": "text", "scentNotes.base": "text" },
      { weights: { name: 10, description: 3, "scentNotes.top": 5, "scentNotes.heart": 5, "scentNotes.base": 5 } }
    );

  await db.collection("variants").createIndex({ productId: 1 });
  await db.collection("variants").createIndex({ sku: 1 }, { unique: true });

  await db.collection("stock_adjustments").createIndex({ variantId: 1, createdAt: -1 });

  console.log("Catalog migration up complete");
}

export async function down() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("db not available");
  await db.dropCollection("products").catch(() => {});
  await db.dropCollection("variants").catch(() => {});
  await db.dropCollection("categories").catch(() => {});
  await db.dropCollection("stock_adjustments").catch(() => {});
  console.log("Catalog migration down complete");
}

if (require.main === module) {
  up().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
