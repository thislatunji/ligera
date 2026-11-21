import mongoose, { Schema, type Model } from "mongoose";

export interface ICategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  type: "category" | "space" | "collection";
  parentId?: mongoose.Types.ObjectId | null;
  description?: string;
  image?: { publicId?: string; alt?: string } | null;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: { type: String, enum: ["category", "space", "collection"], required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    description: { type: String, default: "" },
    image: { publicId: String, alt: String },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Category: Model<ICategory> =
  mongoose.models.Category ?? mongoose.model<ICategory>("Category", CategorySchema);
