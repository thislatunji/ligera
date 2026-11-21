import mongoose from "mongoose";

let connectPromise: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  if (!connectPromise) {
    connectPromise = mongoose
      .connect(uri, { dbName: "ligera" })
      .finally(() => {
        connectPromise = null;
      });
  }

  await connectPromise;
}
