import mongoose = require("mongoose");
import { IConfig } from "./config.interface";

const ConfigSchema = new mongoose.Schema<IConfig>({
  donationAmounts: {
    type: [Number],
    required: true,
    min: 1,
  },
  recurringOptions: {
    type: [
      {
        interval: {
          type: String,
          enum: ["week", "month", "year"],
          required: true,
        },
        intervalCount: {
          type: Number,
          required: true,
          min: 1,
        },
        label: {
          type: String,
          required: true,
        },
      },
    ],
    required: true,
  },
});

export const Config = mongoose.model<IConfig>("Config", ConfigSchema);
