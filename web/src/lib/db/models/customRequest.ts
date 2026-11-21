import mongoose, { Schema, type Model } from "mongoose";

export interface ICustomRequest {
  _id: mongoose.Types.ObjectId;
  requestNumber: string;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  spaceOrSetting: string;
  productTypes: string[];
  scentPreferences: string;
  quantity: number;
  budgetRange: string;
  eventDate?: Date | null;
  referenceImage?: { publicId?: string; url?: string; alt?: string };
  status: "new" | "quoted" | "accepted" | "declined" | "completed";
  quoteAmount?: number | null;
  paymentLink?: {
    linkId?: string;
    linkUrl?: string;
    txRef?: string;
    amount?: number;
    status?: "pending" | "successful" | "failed";
  };
  quotedAt?: Date | null;
  orderId?: mongoose.Types.ObjectId | null;
  notes?: Array<{ userId?: mongoose.Types.ObjectId; userName?: string; note: string; at: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const CustomRequestSchema = new Schema<ICustomRequest>(
  {
    requestNumber: { type: String, required: true, unique: true },
    contact: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
    },
    spaceOrSetting: { type: String, required: true, maxlength: 200 },
    productTypes: [{ type: String, enum: ["candles", "diffusers", "sprays", "gypsum", "bundle"] }],
    scentPreferences: { type: String, required: true, maxlength: 1000 },
    quantity: { type: Number, default: 1 },
    budgetRange: { type: String, default: "" },
    eventDate: { type: Date, default: null },
    referenceImage: { publicId: String, url: String, alt: String },
    status: { type: String, enum: ["new", "quoted", "accepted", "declined", "completed"], default: "new", index: true },
    quoteAmount: { type: Number, default: null },
    paymentLink: {
      linkId: String,
      linkUrl: String,
      txRef: String,
      amount: Number,
      status: { type: String, enum: ["pending", "successful", "failed"] },
    },
    quotedAt: { type: Date, default: null },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    notes: [{ userId: Schema.Types.ObjectId, userName: String, note: String, at: Date }],
  },
  { timestamps: true },
);

CustomRequestSchema.index({ status: 1, createdAt: -1 });
CustomRequestSchema.index({ "contact.email": 1 });
CustomRequestSchema.index({ "paymentLink.txRef": 1 });

export const CustomRequest: Model<ICustomRequest> =
  mongoose.models.CustomRequest ?? mongoose.model<ICustomRequest>("CustomRequest", CustomRequestSchema);
