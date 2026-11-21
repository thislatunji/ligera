import mongoose, { Schema, type Model } from "mongoose";

export interface ISettings {
  _id: mongoose.Types.ObjectId;
  store?: any;
  delivery?: any;
  payment?: any;
  homepage?: any;
  seo?: any;
  emailTemplates?: any;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    store: { type: Schema.Types.Mixed, default: {} },
    delivery: { type: Schema.Types.Mixed, default: {} },
    payment: { type: Schema.Types.Mixed, default: {} },
    homepage: { type: Schema.Types.Mixed, default: {} },
    seo: { type: Schema.Types.Mixed, default: {} },
    emailTemplates: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings ?? mongoose.model<ISettings>("Settings", SettingsSchema);
