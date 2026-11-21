import mongoose, { Schema, type Model } from "mongoose";

export interface IStockAdjustment {
  _id: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  qty?: number;
  delta?: number;
  change?: number;
  quantity?: number;
  reason: string;
  orderId?: string | mongoose.Types.ObjectId;
  actorId?: string | mongoose.Types.ObjectId;
  userId?: string | mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  byUserId?: mongoose.Types.ObjectId | null;
  note?: string;
  createdAt: Date;
}

const StockAdjustmentSchema = new Schema<any>(
  {
    variantId: { type: Schema.Types.ObjectId, ref: "Variant", required: true },
    qty: { type: Number },
    delta: { type: Number },
    change: { type: Number },
    quantity: { type: Number },
    reason: { type: String, required: true },
    orderId: { type: Schema.Types.Mixed },
    actorId: { type: Schema.Types.Mixed },
    userId: { type: Schema.Types.Mixed },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    byUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

if (mongoose.models.StockAdjustment) {
  delete mongoose.models.StockAdjustment;
}

export const StockAdjustment: Model<IStockAdjustment> =
  mongoose.model<IStockAdjustment>("StockAdjustment", StockAdjustmentSchema);
