import { Model, Schema, model, models } from "mongoose";

export type AdminAccountDocument = {
  loginId: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

const adminAccountSchema = new Schema<AdminAccountDocument>(
  {
    loginId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 1,
    },
  },
  {
    timestamps: true,
    collection: "adminAccounts",
    versionKey: false,
  },
);

export const AdminAccountModel: Model<AdminAccountDocument> =
  models.AdminAccount || model<AdminAccountDocument>("AdminAccount", adminAccountSchema);
