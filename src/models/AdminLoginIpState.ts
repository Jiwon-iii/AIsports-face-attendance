import { Model, Schema, model, models } from "mongoose";

export type AdminLoginIpStateDocument = {
  loginId: string;
  ipHash: string;
  failedCount: number;
  windowStartedAt: Date;
  lockedUntil?: Date;
  lastFailedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const adminLoginIpStateSchema = new Schema<AdminLoginIpStateDocument>(
  {
    loginId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    ipHash: {
      type: String,
      required: true,
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
    collection: "adminLoginIpStates",
    versionKey: false,
  },
);

adminLoginIpStateSchema.index({ loginId: 1, ipHash: 1 }, { unique: true });

export const AdminLoginIpStateModel: Model<AdminLoginIpStateDocument> =
  models.AdminLoginIpState ||
  model<AdminLoginIpStateDocument>("AdminLoginIpState", adminLoginIpStateSchema);
