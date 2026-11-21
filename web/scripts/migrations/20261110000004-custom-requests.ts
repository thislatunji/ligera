import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";

export async function up() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("db not available");

  const collections = await db.listCollections({ name: "custom_requests" }).toArray();
  if (collections.length === 0) {
    await db.createCollection("custom_requests");
  }

  const collection = db.collection("custom_requests");
  await collection.createIndex({ status: 1, createdAt: -1 });
  await collection.createIndex({ "contact.email": 1 });
  await collection.createIndex({ requestNumber: 1 }, { unique: true });
  await collection.createIndex({ "paymentLink.txRef": 1 });
}

export async function down() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error("db not available");
  await db.dropCollection("custom_requests").catch(() => {});
}

if (require.main === module) {
  up()
    .then(() => {
      console.log("Migration up completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
