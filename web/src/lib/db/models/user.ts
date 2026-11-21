import mongoose, { Schema, type Model } from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: "owner" | "staff";
  twoFactorEnabled: boolean;
  twoFactorSecretEncrypted?: string | null;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  resetTokenHash?: string | null;
  resetExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "staff"], required: true },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecretEncrypted: { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
