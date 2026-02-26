import { Model, Schema, model, models } from "mongoose";

export type AdminSessionDocument = {
  loginId: string;
  tokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const adminSessionSchema = new Schema<AdminSessionDocument>(
  {
    loginId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "adminSessions",
    versionKey: false,
  },
);

adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminSessionModel: Model<AdminSessionDocument> =
  models.AdminSession || model<AdminSessionDocument>("AdminSession", adminSessionSchema);
