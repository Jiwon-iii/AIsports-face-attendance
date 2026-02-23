import { Model, Schema, models, model } from "mongoose";

export type UserDocument = {
  userId: string;
  name: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "users",
    versionKey: false,
  },
);

export const UserModel: Model<UserDocument> =
  models.User || model<UserDocument>("User", userSchema);
