import { Model, Schema, models, model } from "mongoose";

export const ATTENDANCE_STATUSES = ["SUCCESS", "FAILED", "MANUAL"] as const;
export const CHECK_TYPES = ["IN", "OUT"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type CheckType = (typeof CHECK_TYPES)[number];

export type AttendanceRecordDocument = {
  userId: string;
  checkType: CheckType;
  status: AttendanceStatus;
  matchedScore?: number;
  livenessScore?: number;
  capturedAt: Date;
  deviceId?: string;
  createdAt: Date;
  updatedAt: Date;
};

const attendanceRecordSchema = new Schema<AttendanceRecordDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    checkType: {
      type: String,
      enum: CHECK_TYPES,
      required: true,
      default: "IN",
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      required: true,
    },
    matchedScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    livenessScore: {
      type: Number,
      min: 0,
      max: 1,
    },
    capturedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    deviceId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "attendanceRecords",
    versionKey: false,
  },
);

attendanceRecordSchema.index({ userId: 1, capturedAt: -1 });

export const AttendanceRecordModel: Model<AttendanceRecordDocument> =
  models.AttendanceRecord ||
  model<AttendanceRecordDocument>("AttendanceRecord", attendanceRecordSchema);
