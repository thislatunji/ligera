import mongoose, { Schema, type Model } from "mongoose";

export interface IVariant {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  label?: string;
  name?: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  stockQty?: number;
  stock?: number;
  heldQty?: number;
  lowStockThreshold?: number;
  costPrice?: number;
  active?: boolean;
  status?: string;
  madeToOrder?: boolean;
  leadTimeDays?: number;
  externalRef?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<any>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    label: { type: String, trim: true, maxlength: 60 },
    name: { type: String },
    sku: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    stockQty: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    heldQty: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    costPrice: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    status: { type: String },
    madeToOrder: { type: Boolean, default: false },
    leadTimeDays: { type: Number, default: 0 },
    externalRef: { type: String, default: null },
  },
  { timestamps: true },
);

if (mongoose.models.Variant) {
  delete mongoose.models.Variant;
}

export const Variant: Model<IVariant> =
  mongoose.model<IVariant>("Variant", VariantSchema);
