import mongoose, { Schema, type Model } from "mongoose";

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  orderNumber?: string;
  reference?: string;
  linkId?: string;
  linkUrl?: string;
  amount?: number;
  currency?: string;
  status: string;
  externalRef?: string;
  provider?: string;
  verifiedAt?: Date;
  rawEvent?: any;
  attempts?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    orderNumber: { type: String },
    reference: { type: String },
    linkId: { type: String },
    linkUrl: { type: String },
    amount: { type: Number },
    currency: { type: String, default: "NGN" },
    status: { type: String, required: true },
    externalRef: { type: String },
    provider: { type: String, default: "flutterwave" },
    verifiedAt: { type: Date },
    rawEvent: { type: Schema.Types.Mixed },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment ?? mongoose.model<IPayment>("Payment", PaymentSchema);
