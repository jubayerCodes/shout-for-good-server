import { Request, Response } from "express";
import { stripe } from "./stripe";
import { Payment } from "./payments.model";
import { sendReceiptEmail } from "../email/email.service";

/**
 * POST /api/webhook
 *
 * Handles Stripe webhook events for payment confirmations.
 * Expects the raw body (not parsed JSON) for signature verification.
 *
 * Listens for:
 * - payment_intent.succeeded → one-time donations
 * - invoice.payment_succeeded → recurring subscription payments
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(
        req.body, // raw body buffer
        sig,
        webhookSecret
      );
    } else {
      // Dev mode — parse the raw body directly (no signature verification)
      console.warn(
        "⚠️  No STRIPE_WEBHOOK_SECRET set — skipping signature verification (dev mode)"
      );
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Webhook signature verification failed: ${message}`);
    res.status(400).json({ error: `Webhook Error: ${message}` });
    return;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      }

      case "invoice.payment_succeeded": {
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

/**
 * Handle a successful one-time payment.
 * Finds the Payment by paymentId (PaymentIntent ID) and sends a receipt.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log(`✅ PaymentIntent succeeded: ${paymentIntent.id}`);

  const payment = await Payment.findOne({ paymentId: paymentIntent.id });

  if (!payment) {
    console.warn(
      `⚠️  No Payment record found for PaymentIntent ${paymentIntent.id}`
    );
    return;
  }

  // Update payment status
  payment.paymentStatus = "succeeded";

  // Send receipt email if requested and not already sent
  if (payment.issueReceipt && !payment.receiptSent) {
    const sent = await sendReceiptEmail({
      to: payment.paymentDetails.email,
      donorName: `${payment.paymentDetails.firstName} ${payment.paymentDetails.lastName}`,
      amount: payment.amount,
      currency: "aud",
      type: payment.type,
      interval: payment.interval,
      intervalCount: payment.intervalCount,
      paymentId: payment.paymentId,
      companyName: payment.paymentDetails.companyName || undefined,
      phone: payment.paymentDetails.phone || undefined,
      dedication: payment.dedication
        ? {
            firstName: payment.dedication.firstName,
            lastName: payment.dedication.lastName,
          }
        : null,
      date: payment.createdAt,
    });

    if (sent) {
      payment.receiptSent = true;
    }
  }

  await payment.save();
}

/**
 * Handle a successful invoice payment (recurring subscriptions).
 * Finds the Payment by paymentId (Subscription ID) and sends a receipt.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInvoicePaymentSucceeded(invoice: any) {
  // Get the subscription ID from the invoice
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) {
    console.warn("⚠️  Invoice has no subscription ID — skipping");
    return;
  }

  console.log(
    `✅ Invoice payment succeeded for subscription: ${subscriptionId}`
  );

  const payment = await Payment.findOne({ paymentId: subscriptionId });

  if (!payment) {
    console.warn(
      `⚠️  No Payment record found for subscription ${subscriptionId}`
    );
    return;
  }

  // Update payment status
  payment.paymentStatus = "active";

  // Send receipt email if requested and not already sent
  if (payment.issueReceipt && !payment.receiptSent) {
    const sent = await sendReceiptEmail({
      to: payment.paymentDetails.email,
      donorName: `${payment.paymentDetails.firstName} ${payment.paymentDetails.lastName}`,
      amount: payment.amount,
      currency: "aud",
      type: payment.type,
      frequency: payment.interval
        ? `${payment.interval}-${payment.intervalCount}`
        : undefined,
      interval: payment.interval,
      intervalCount: payment.intervalCount,
      paymentId: payment.paymentId,
      companyName: payment.paymentDetails.companyName || undefined,
      phone: payment.paymentDetails.phone || undefined,
      dedication: payment.dedication
        ? {
            firstName: payment.dedication.firstName,
            lastName: payment.dedication.lastName,
          }
        : null,
      date: payment.createdAt,
    });

    if (sent) {
      payment.receiptSent = true;
    }
  }

  await payment.save();
}
