import { Model, Schema, model, models } from "mongoose";

export const USER_GENDERS = ["MALE", "FEMALE"] as const;
export type UserGender = (typeof USER_GENDERS)[number];

export type UserDocument = {
  userId: string;
  name: string;
  gender: UserGender;
  age: number;
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
      maxlength: 100,
    },
    gender: {
      type: String,
      enum: USER_GENDERS,
      required: true,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
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

export const UserModel: Model<UserDocument> = models.User || model<UserDocument>("User", userSchema);
