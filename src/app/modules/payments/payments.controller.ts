import { Request, Response } from "express";
import { stripe } from "./stripe";
import { Payment } from "./payments.model";
import { IntervalEnum } from "../config/config.interface";
import { sendStripeReceiptEmail } from "../email/email.service";

/**
 * POST /api/donate
 *
 * Handles one-time and recurring donations via Stripe.
 * - One-time: creates a PaymentIntent
 * - Recurring (fortnightly/monthly): creates a Customer, Product, Price, and Subscription
 *
 * Returns { clientSecret, type } for the client to confirm with Stripe.js
 */
export const createDonation = async (req: Request, res: Response) => {
  try {
    const {
      amount,
      currency = "aud",
      frequency,
      interval: clientInterval,
      intervalCount: clientIntervalCount,
      email,
      firstName,
      lastName,
      companyName,
      phone,
      issueReceipt,
      dedication,
    } = req.body;

    // Validate required fields
    if (!amount || !email || !firstName || !lastName) {
      res.status(400).json({
        message: "Missing required fields: amount, email, firstName, lastName",
      });
      return;
    }

    if (amount < 200) {
      // Stripe minimum is typically 50 cents, but our min is $2 (200 cents)
      res.status(400).json({ message: "Minimum donation is $2 (200 cents)" });
      return;
    }

    const customerName = `${firstName} ${lastName}`;
    const metadata: Record<string, string> = {
      firstName,
      lastName,
      frequency: frequency || "one-time",
    };

    if (companyName) metadata.companyName = companyName;
    if (phone) metadata.phone = phone;

    if (dedication) {
      metadata.dedicationHonoree = `${dedication.honoreeFirstName} ${dedication.honoreeLastName}`;
      if (dedication.notifySomeone && dedication.notifyEmail) {
        metadata.dedicationNotify = dedication.notifyEmail;
      }
    }

    // ─── ONE-TIME DONATION ───
    if (!frequency || frequency === "one-time") {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        metadata,
        receipt_email: email,
        description: `One-time donation from ${customerName}`,
      });

      // Save to database
      await Payment.create({
        amount,
        type: "one_time",
        interval: null,
        intervalCount: null,
        dedication: dedication
          ? {
              firstName: dedication.honoreeFirstName,
              lastName: dedication.honoreeLastName,
              notify: dedication.notifySomeone
                ? {
                    firstName: dedication.notifyFirstName,
                    lastName: dedication.notifyLastName,
                    email: dedication.notifyEmail,
                    message: dedication.message || "",
                  }
                : undefined,
            }
          : undefined,
        paymentDetails: {
          companyName: companyName || undefined,
          firstName,
          lastName,
          email,
          phone: phone || undefined,
        },
        paymentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
        issueReceipt: issueReceipt ?? true,
        receiptSent: false,
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        type: "payment_intent",
      });
      return;
    }

    // ─── RECURRING DONATION ───

    // Use interval/intervalCount from client (set by admin config)
    const interval: "week" | "month" | "year" = clientInterval;
    const intervalCount: number = clientIntervalCount || 1;

    if (!["week", "month", "year"].includes(interval)) {
      res.status(400).json({ message: `Invalid interval: ${interval}` });
      return;
    }

    // 1. Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let customer: any;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      // Update name if needed
      await stripe.customers.update(customer.id, {
        name: customerName,
        metadata,
      });
    } else {
      customer = await stripe.customers.create({
        email,
        name: customerName,
        phone: phone || undefined,
        metadata,
      });
    }

    // 2. Create a product for this donation
    const product = await stripe.products.create({
      name: `Princes Court Together — ${frequency === "fortnightly" ? "Fortnightly" : "Monthly"} Donation`,
      metadata: {
        type: "recurring_donation",
        frequency,
      },
    });

    // 3. Create a price for the product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency,
      recurring: {
        interval,
        interval_count: intervalCount,
      },
    });

    // 4. Create subscription (invoice is auto-finalized by Stripe)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      metadata,
    });

    // 5. Get the invoice ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestInvoice = subscription.latest_invoice as any;
    const invoiceId =
      typeof latestInvoice === "object" ? latestInvoice.id : latestInvoice;

    // 6. Retrieve the invoice directly to get payment_intent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let clientSecret: string | null = null;

    // Try retrieving invoice directly — may have payment_intent in direct fetch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = (await stripe.invoices.retrieve(invoiceId)) as any;
    const piRef = invoice.payment_intent;

    if (piRef && typeof piRef === "string") {
      const pi = await stripe.paymentIntents.retrieve(piRef);
      clientSecret = pi.client_secret;
    } else if (piRef && typeof piRef === "object" && piRef.client_secret) {
      clientSecret = piRef.client_secret;
    }

    // Fallback: find PaymentIntent by listing the customer's incomplete ones
    if (!clientSecret) {
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 5,
      });
      const incompletePI = paymentIntents.data.find(
        (p) =>
          p.status === "requires_payment_method" ||
          p.status === "requires_confirmation"
      );
      if (incompletePI) {
        clientSecret = incompletePI.client_secret;
      }
    }

    if (!clientSecret) {
      res.status(500).json({
        message: "Failed to create subscription payment. Please try again.",
      });
      return;
    }

    // Save to database
    await Payment.create({
      amount,
      type: "recurring",
      interval: interval as unknown as IntervalEnum,
      intervalCount,
      dedication: dedication
        ? {
            firstName: dedication.honoreeFirstName,
            lastName: dedication.honoreeLastName,
            notify: dedication.notifySomeone
              ? {
                  firstName: dedication.notifyFirstName,
                  lastName: dedication.notifyLastName,
                  email: dedication.notifyEmail,
                  message: dedication.message || "",
                }
              : undefined,
          }
        : undefined,
      paymentDetails: {
        companyName: companyName || undefined,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
      },
      paymentId: subscription.id,
      paymentStatus: subscription.status,
      issueReceipt: issueReceipt ?? true,
      receiptSent: false,
    });

    res.status(200).json({
      clientSecret,
      type: "subscription",
    });
  } catch (error) {
    console.error("Donation error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ message });
  }
};

/**
 * POST /api/send-receipt
 *
 * Called by the client after a successful payment.
 * Fetches the Stripe receipt URL from the charge and emails it to the donor.
 */
export const sendReceipt = async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, email } = req.body;

    if (!paymentIntentId || !email) {
      res.status(400).json({
        message: "Missing required fields: paymentIntentId, email",
      });
      return;
    }

    // Retrieve the PaymentIntent and expand the latest charge
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      { expand: ["latest_charge"] }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const charge = paymentIntent.latest_charge as any;
    const receiptUrl = charge?.receipt_url;

    if (!receiptUrl) {
      res.status(404).json({ message: "Receipt not available yet" });
      return;
    }

    // Send the Stripe receipt URL via email
    const sent = await sendStripeReceiptEmail({
      to: email,
      receiptUrl,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    // Update the Payment record
    await Payment.findOneAndUpdate(
      { paymentId: paymentIntentId },
      { receiptSent: true, paymentStatus: "succeeded" }
    );

    res.status(200).json({ sent, receiptUrl });
  } catch (error) {
    console.error("Send receipt error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ message });
  }
};
