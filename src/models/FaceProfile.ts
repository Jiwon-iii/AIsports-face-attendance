import { Model, Schema, models, model } from "mongoose";

export type FaceProfileDocument = {
  userId: string;
  embeddings: number[][];
  qualityScore?: number;
  createdAt: Date;
  updatedAt: Date;
};

const faceProfileSchema = new Schema<FaceProfileDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    embeddings: {
      type: [[Number]],
      required: true,
      validate: {
        validator: (value: number[][]) => value.length > 0,
        message: "embeddings must include at least one vector.",
      },
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
    collection: "faceProfiles",
    versionKey: false,
  },
);

export const FaceProfileModel: Model<FaceProfileDocument> =
  models.FaceProfile || model<FaceProfileDocument>("FaceProfile", faceProfileSchema);
