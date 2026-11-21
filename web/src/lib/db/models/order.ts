import mongoose, { Schema, type Model } from "mongoose";

export interface IOrder {
  _id: mongoose.Types.ObjectId;
  orderNumber?: string;
  status: string;
  paymentStatus?: string;
  total?: number;
  subtotal?: number;
  deliveryFee?: number;
  discount?: number;
  customer?: any;
  items?: any[];
  externalRef?: string;
  customerId?: mongoose.Types.ObjectId | null;
  deliveryMethod?: string;
  deliveryZoneId?: mongoose.Types.ObjectId | null;
  deliveryZoneName?: string;
  deliveryAddress?: any;
  giftNote?: string;
  hidePrices?: boolean;
  statusTimeline?: any[];
  holdExpiresAt?: Date | null;
  expectedDeliveryWindow?: string;
  restoreStockOnCancel?: boolean;
  source?: string;
  internalNotes?: any[];
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, index: true },
    status: { type: String, required: true, index: true },
    paymentStatus: { type: String, default: "pending" },
    total: { type: Number },
    subtotal: { type: Number },
    deliveryFee: { type: Number },
    discount: { type: Number },
    customer: { type: Schema.Types.Mixed },
    items: [{ type: Schema.Types.Mixed }],
    externalRef: { type: String, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deliveryMethod: { type: String },
    deliveryZoneId: { type: Schema.Types.ObjectId, default: null },
    deliveryZoneName: { type: String },
    deliveryAddress: { type: Schema.Types.Mixed },
    giftNote: { type: String },
    hidePrices: { type: Boolean, default: false },
    statusTimeline: [{ type: Schema.Types.Mixed }],
    holdExpiresAt: { type: Date, default: null },
    expectedDeliveryWindow: { type: String },
    restoreStockOnCancel: { type: Boolean, default: true },
    source: { type: String },
    internalNotes: [{ type: Schema.Types.Mixed }],
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Order: Model<IOrder> =
  mongoose.models.Order ?? mongoose.model<IOrder>("Order", OrderSchema);
