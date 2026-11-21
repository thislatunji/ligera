import mongoose, { Schema, type Model } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false },
);

export const Counter: Model<ICounter> =
  mongoose.models.Counter ?? mongoose.model<ICounter>("Counter", CounterSchema);

export async function nextNumber(key: "order" | "custom_request"): Promise<string> {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  const prefix = key === "order" ? "LG-" : "CR-";
  return `${prefix}${String(doc.seq).padStart(6, "0")}`;
}
