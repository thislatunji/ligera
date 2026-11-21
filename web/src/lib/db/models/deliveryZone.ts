import mongoose, { Schema, type Model } from "mongoose";

export interface IDeliveryZone {
  _id: mongoose.Types.ObjectId;
  name: string;
  fee: number;
  etaText?: string;
  active: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    fee: { type: Number, required: true, min: 0 },
    etaText: { type: String, default: "" },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

DeliveryZoneSchema.index({ active: 1, sortOrder: 1 });

export const DeliveryZone: Model<IDeliveryZone> =
  mongoose.models.DeliveryZone ?? mongoose.model<IDeliveryZone>("DeliveryZone", DeliveryZoneSchema);
