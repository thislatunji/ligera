import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { Order } from "@/lib/db/models/order";
import { Payment } from "@/lib/db/models/payment";
import { DeliveryZone } from "@/lib/db/models/deliveryZone";
import { Customer } from "@/lib/db/models/customer";

export async function up() {
  await connectDb();
  // Ensure indexes are created
  await Order.createIndexes();
  await Payment.createIndexes();
  await DeliveryZone.createIndexes();
  await Customer.createIndexes();

  // Seed default Lagos zones if none exist
  const count = await DeliveryZone.countDocuments();
  if (count === 0) {
    await DeliveryZone.insertMany([
      { name: "Ikeja", fee: 2000, etaText: "2–3 working days", active: true, sortOrder: 1 },
      { name: "Lekki", fee: 3000, etaText: "2–3 working days", active: true, sortOrder: 2 },
      { name: "Victoria Island", fee: 4000, etaText: "2–3 working days", active: true, sortOrder: 3 },
      { name: "Surulere", fee: 2000, etaText: "2–3 working days", active: true, sortOrder: 4 },
    ]);
  }
}

export async function down() {
  await connectDb();
  await Order.deleteMany({});
  await Payment.deleteMany({});
  await DeliveryZone.deleteMany({});
  await Customer.deleteMany({});
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
