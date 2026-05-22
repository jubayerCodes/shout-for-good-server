"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const mongoose = require("mongoose");
const PaymentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ["one_time", "recurring"],
        required: true,
    },
    interval: {
        type: String,
        enum: ["week", "month", "year", null],
        default: null,
    },
    intervalCount: {
        type: Number,
        default: null,
    },
    dedication: {
        firstName: String,
        lastName: String,
        notify: {
            firstName: String,
            lastName: String,
            email: String,
            message: String,
        },
    },
    paymentDetails: {
        companyName: String,
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        phone: String,
    },
    paymentId: {
        type: String,
        required: true,
    },
    paymentStatus: {
        type: String,
        required: true,
    },
    issueReceipt: {
        type: Boolean,
        default: true,
    },
    receiptSent: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
exports.Payment = mongoose.model("Payment", PaymentSchema);
