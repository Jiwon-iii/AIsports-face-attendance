import { Model, Schema, models, model } from "mongoose";

export type ConsentDocument = {
  userId: string;
  version: string;
  agreedAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const consentSchema = new Schema<ConsentDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
    agreedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "consents",
    versionKey: false,
  },
);

consentSchema.index({ userId: 1, version: 1 }, { unique: true });

export const ConsentModel: Model<ConsentDocument> =
  models.Consent || model<ConsentDocument>("Consent", consentSchema);
