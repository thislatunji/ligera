import mongoose, { Schema, type Model } from "mongoose";

export interface IContentPageSection {
  heading: string;
  body: string;
  image?: { publicId: string; alt: string } | null;
}

export interface IContentPage {
  _id: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  sections: IContentPageSection[];
  seo?: { title?: string; metaDescription?: string };
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContentPageSchema = new Schema<IContentPage>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, maxlength: 120 },
    sections: [
      {
        heading: { type: String, maxlength: 160, default: "" },
        body: { type: String, maxlength: 8000 },
        image: {
          publicId: String,
          alt: String,
        },
        _id: false,
      },
    ],
    seo: {
      title: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

ContentPageSchema.index({ slug: 1 }, { unique: true });

export const ContentPage: Model<IContentPage> =
  mongoose.models.ContentPage ?? mongoose.model<IContentPage>("ContentPage", ContentPageSchema);
