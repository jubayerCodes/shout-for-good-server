"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const mongoose = require("mongoose");
const ConfigSchema = new mongoose.Schema({
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
exports.Config = mongoose.model("Config", ConfigSchema);
