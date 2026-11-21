import mongoose, { Schema, type Model } from "mongoose";

export const NOTIFICATION_TYPES = [
  "order.paid.customer",
  "order.paid.owner",
  "order.status.customer",
  "order.cancelled.customer",
  "custom_request.submitted.customer",
  "custom_request.submitted.owner",
  "custom_request.quoted.customer",
  "stock.low.owner",
  "payment.mismatch.owner",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotificationLog {
  _id: mongoose.Types.ObjectId;
  type: NotificationType;
  recipient: string;
  orderId?: mongoose.Types.ObjectId | null;
  customRequestId?: mongoose.Types.ObjectId | null;
  dedupeKey: string;
  payload: Record<string, unknown>;
  status: "pending" | "sent" | "failed";
  retryCount: number;
  nextAttemptAt: Date;
  sentAt?: Date | null;
  lastError?: string | null;
  providerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    recipient: { type: String, required: true, lowercase: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    customRequestId: { type: Schema.Types.ObjectId, ref: "CustomRequest", default: null, index: true },
    dedupeKey: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending", index: true },
    retryCount: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: () => new Date() },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    providerId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

NotificationLogSchema.index({ status: 1, nextAttemptAt: 1 });
NotificationLogSchema.index({ orderId: 1, createdAt: -1 });
NotificationLogSchema.index({ createdAt: -1 });

export const NotificationLog: Model<INotificationLog> =
  mongoose.models.NotificationLog ?? mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);
