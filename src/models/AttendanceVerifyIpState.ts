import { Model, Schema, model, models } from "mongoose";

export type AttendanceVerifyIpStateDocument = {
  ipHash: string;
  requestCount: number;
  windowStartedAt: Date;
  lockedUntil?: Date;
  lastRequestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const attendanceVerifyIpStateSchema = new Schema<AttendanceVerifyIpStateDocument>(
  {
    ipHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    requestCount: {
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
    lastRequestedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "attendanceVerifyIpStates",
    versionKey: false,
  },
);

export const AttendanceVerifyIpStateModel: Model<AttendanceVerifyIpStateDocument> =
  models.AttendanceVerifyIpState ||
  model<AttendanceVerifyIpStateDocument>("AttendanceVerifyIpState", attendanceVerifyIpStateSchema);
