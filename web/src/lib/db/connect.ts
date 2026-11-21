import mongoose from "mongoose";

let connected = false;

export async function connectDb(): Promise<void> {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }
  await mongoose.connect(uri, { dbName: "ligera" });
  connected = true;
}
