import mongoose from "mongoose";
import { connectDb } from "../src/lib/db/connect";

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

down().catch((e) => {
  console.error(e);
  process.exit(1);
});
