"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStripeReceiptEmail = exports.verifyEmailConnection = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const email_template_1 = require("./email.template");
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const verifyEmailConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("⚠️  SMTP credentials not configured. Receipt emails will not be sent.");
        return;
    }
    try {
        yield transporter.verify();
        console.log("✅ SMTP connection verified — receipt emails are enabled.");
    }
    catch (error) {
        console.warn("⚠️  SMTP connection failed:", error);
        console.warn("   Receipt emails will not be sent until SMTP is configured.");
    }
});
exports.verifyEmailConnection = verifyEmailConnection;
const sendStripeReceiptEmail = (data) => __awaiter(void 0, void 0, void 0, function* () {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("⚠️  Skipping receipt email — SMTP not configured.");
        return false;
    }
    const fromName = process.env.SMTP_FROM_NAME || "Princes Court Together";
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    try {
        const html = (0, email_template_1.generateStripeReceiptEmailHTML)(data);
        const amountFormatted = (data.amount / 100).toLocaleString("en-AU", {
            style: "currency",
            currency: data.currency.toUpperCase(),
        });
        yield transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: data.to,
            subject: `Donation Receipt — ${amountFormatted} — Thank you!`,
            html,
        });
        console.log(`📧 Receipt email sent to ${data.to}`);
        return true;
    }
    catch (error) {
        console.error("❌ Failed to send receipt email:", error);
        return false;
    }
});
exports.sendStripeReceiptEmail = sendStripeReceiptEmail;
