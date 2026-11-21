import mongoose, { Schema, type Model } from "mongoose";

export interface ICustomer {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  phone?: string;
  addresses?: Array<{ address?: string; city?: string; state?: string; zoneId?: mongoose.Types.ObjectId }>;
  marketingConsent?: boolean;
  lastOrderAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    addresses: [{ address: String, city: String, state: String, zoneId: Schema.Types.ObjectId }],
    marketingConsent: { type: Boolean, default: false },
    lastOrderAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Customer: Model<ICustomer> =
  mongoose.models.Customer ?? mongoose.model<ICustomer>("Customer", CustomerSchema);
