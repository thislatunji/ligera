import mongoose, { Schema, type Model } from "mongoose";

export interface IActivityLog {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  entity: { type: string; id: string };
  before?: any;
  after?: any;
  ip?: string | null;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true },
    entity: { type: new Schema({ type: { type: String }, id: String }, { _id: false }), required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ?? mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
