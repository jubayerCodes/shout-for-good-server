import nodemailer from "nodemailer";
import { generateStripeReceiptEmailHTML } from "./email.template";

// ── SMTP Transporter ──
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Verify SMTP connection on startup.
 * Logs a warning if credentials are missing or invalid — does NOT throw.
 */
export const verifyEmailConnection = async (): Promise<void> => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      "⚠️  SMTP credentials not configured. Receipt emails will not be sent.",
    );
    return;
  }

  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified — receipt emails are enabled.");
  } catch (error) {
    console.warn("⚠️  SMTP connection failed:", error);
    console.warn(
      "   Receipt emails will not be sent until SMTP is configured.",
    );
  }
};

// ── Stripe Receipt Email Data ──
export interface StripeReceiptEmailData {
  to: string;
  receiptUrl: string;
  amount: number; // in cents
  currency: string;
}

/**
 * Send an email containing the Stripe-generated receipt URL.
 * Returns true if sent successfully, false otherwise.
 */
export const sendStripeReceiptEmail = async (
  data: StripeReceiptEmailData,
): Promise<boolean> => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️  Skipping receipt email — SMTP not configured.");
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || "Princes Court Together";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    const html = generateStripeReceiptEmailHTML(data);

    const amountFormatted = (data.amount / 100).toLocaleString("en-AU", {
      style: "currency",
      currency: data.currency.toUpperCase(),
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: data.to,
      subject: `Donation Receipt — ${amountFormatted} — Thank you!`,
      html,
    });

    return true;
  } catch (error) {
    console.error("❌ Failed to send receipt email:", error);
    return false;
  }
};
