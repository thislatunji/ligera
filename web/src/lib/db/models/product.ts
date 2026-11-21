import mongoose, { Schema, type Model } from "mongoose";

export interface IProductImage {
  publicId: string;
  alt: string;
  width?: number;
  height?: number;
  position?: number;
}

export interface IProductScentNotes {
  top: string[];
  heart: string[];
  base: string[];
}

export interface IProductSeo {
  title?: string;
  metaDescription?: string;
  ogImage?: string;
}

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  categoryId?: mongoose.Types.ObjectId | null;
  spaceTagIds?: mongoose.Types.ObjectId[];
  scentNotes?: IProductScentNotes;
  ingredients?: string;
  safetyInfo?: string;
  burnTime?: string;
  dimensions?: string;
  finish?: string;
  madeToOrder?: boolean;
  leadTimeDays?: number;
  status: "draft" | "published" | "archived";
  images?: IProductImage[];
  pairsWith?: mongoose.Types.ObjectId[];
  seo?: IProductSeo;
  popularity?: number;
  featured?: boolean;
  sortOrder?: number;
  externalRef?: string | null;
  minPrice?: number;
  variants?: any;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: "", maxlength: 4000 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    spaceTagIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    scentNotes: {
      top: [{ type: String, trim: true }],
      heart: [{ type: String, trim: true }],
      base: [{ type: String, trim: true }],
    },
    ingredients: { type: String, default: "" },
    safetyInfo: { type: String, default: "" },
    burnTime: { type: String, default: "" },
    dimensions: { type: String, default: "" },
    finish: { type: String, default: "" },
    madeToOrder: { type: Boolean, default: false },
    leadTimeDays: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    images: [
      {
        publicId: String,
        alt: { type: String, required: true },
        width: Number,
        height: Number,
        position: Number,
      },
    ],
    pairsWith: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    seo: { title: String, metaDescription: String, ogImage: String },
    popularity: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    externalRef: { type: String, default: null },
    minPrice: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ProductSchema.index({ status: 1, categoryId: 1, sortOrder: 1 });
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ status: 1, minPrice: 1 });
ProductSchema.index({ spaceTagIds: 1, status: 1 });
ProductSchema.index(
  { name: "text", description: "text", "scentNotes.top": "text", "scentNotes.heart": "text", "scentNotes.base": "text" },
  { weights: { name: 10, description: 3, "scentNotes.top": 5, "scentNotes.heart": 5, "scentNotes.base": 5 } }
);

export const Product: Model<IProduct> =
  mongoose.models.Product ?? mongoose.model<IProduct>("Product", ProductSchema);
