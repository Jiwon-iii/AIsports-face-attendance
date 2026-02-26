import { Model, Schema, model, models } from "mongoose";

export type AdminLoginStateDocument = {
  loginId: string;
  failedCount: number;
  windowStartedAt: Date;
  lockedUntil?: Date;
  lastFailedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const adminLoginStateSchema = new Schema<AdminLoginStateDocument>(
  {
    loginId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    failedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    windowStartedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lockedUntil: {
      type: Date,
      required: false,
    },
    lastFailedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "adminLoginStates",
    versionKey: false,
  },
);

export const AdminLoginStateModel: Model<AdminLoginStateDocument> =
  models.AdminLoginState || model<AdminLoginStateDocument>("AdminLoginState", adminLoginStateSchema);
