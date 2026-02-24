import { Model, Schema, models, model } from "mongoose";

export const FACE_SAMPLE_SOURCES = ["camera", "upload"] as const;

export type FaceSample = {
  imageDataUrl: string;
  source: (typeof FACE_SAMPLE_SOURCES)[number];
  capturedAt: Date;
};

export type FaceProfileDocument = {
  userId: string;
  samples: FaceSample[];
  embeddings?: number[][];
  qualityScore?: number;
  createdAt: Date;
  updatedAt: Date;
};

const sampleSchema = new Schema<FaceSample>(
  {
    imageDataUrl: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: FACE_SAMPLE_SOURCES,
      required: true,
    },
    capturedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const faceProfileSchema = new Schema<FaceProfileDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      unique: true,
      trim: true,
    },
    samples: {
      type: [sampleSchema],
      default: [],
      validate: {
        validator: (value: FaceSample[]) => value.length <= 1,
        message: "samples can include only one item.",
      },
    },
    embeddings: {
      type: [[Number]],
      required: false,
      validate: {
        validator: (value?: number[][]) => !value || value.length > 0,
        message: "embeddings must include at least one vector when provided.",
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

faceProfileSchema.pre("validate", function onValidate(next) {
  const hasSamples = Array.isArray(this.samples) && this.samples.length > 0;
  const hasEmbeddings = Array.isArray(this.embeddings) && this.embeddings.length > 0;
  if (!hasSamples && !hasEmbeddings) {
    this.invalidate("samples", "samples or embeddings is required.");
  }
  next();
});

export const FaceProfileModel: Model<FaceProfileDocument> =
  models.FaceProfile || model<FaceProfileDocument>("FaceProfile", faceProfileSchema);
