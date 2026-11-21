import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { NotificationLog } from "@/lib/db/models/notificationLog";

export async function up() {
  await connectDb();
  await NotificationLog.createIndexes();
}

export async function down() {
  await connectDb();
  await NotificationLog.deleteMany({});
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
