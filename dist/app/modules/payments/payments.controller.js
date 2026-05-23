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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReceipt = exports.createDonation = void 0;
const stripe_1 = require("./stripe");
const payments_model_1 = require("./payments.model");
const email_service_1 = require("../email/email.service");
const createDonation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, currency = "usd", frequency, interval: clientInterval, intervalCount: clientIntervalCount, email, firstName, lastName, companyName, phone, issueReceipt, dedication, } = req.body;
        if (!amount || !email || !firstName || !lastName) {
            res.status(400).json({
                message: "Missing required fields: amount, email, firstName, lastName",
            });
            return;
        }
        if (amount < 200) {
            res.status(400).json({ message: "Minimum donation is $2 (200 cents)" });
            return;
        }
        const customerName = `${firstName} ${lastName}`;
        const metadata = {
            firstName,
            lastName,
            frequency: frequency || "one-time",
        };
        if (companyName)
            metadata.companyName = companyName;
        if (phone)
            metadata.phone = phone;
        if (dedication) {
            metadata.dedicationHonoree = `${dedication.honoreeFirstName} ${dedication.honoreeLastName}`;
            if (dedication.notifySomeone && dedication.notifyEmail) {
                metadata.dedicationNotify = dedication.notifyEmail;
            }
        }
        if (!frequency || frequency === "one-time") {
            const paymentIntent = yield stripe_1.stripe.paymentIntents.create({
                amount,
                currency,
                metadata,
                receipt_email: email,
                description: `One-time donation from ${customerName}`,
            });
            yield payments_model_1.Payment.create({
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
                issueReceipt: issueReceipt !== null && issueReceipt !== void 0 ? issueReceipt : true,
                receiptSent: false,
            });
            res.status(200).json({
                clientSecret: paymentIntent.client_secret,
                type: "payment_intent",
            });
            return;
        }
        const interval = clientInterval;
        const intervalCount = clientIntervalCount || 1;
        if (!["week", "month", "year"].includes(interval)) {
            res.status(400).json({ message: `Invalid interval: ${interval}` });
            return;
        }
        const existingCustomers = yield stripe_1.stripe.customers.list({
            email,
            limit: 1,
        });
        let customer;
        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
            yield stripe_1.stripe.customers.update(customer.id, {
                name: customerName,
                metadata,
            });
        }
        else {
            customer = yield stripe_1.stripe.customers.create({
                email,
                name: customerName,
                phone: phone || undefined,
                metadata,
            });
        }
        const product = yield stripe_1.stripe.products.create({
            name: `Princes Court Together — ${frequency === "fortnightly" ? "Fortnightly" : "Monthly"} Donation`,
            metadata: {
                type: "recurring_donation",
                frequency,
            },
        });
        const price = yield stripe_1.stripe.prices.create({
            product: product.id,
            unit_amount: amount,
            currency,
            recurring: {
                interval,
                interval_count: intervalCount,
            },
        });
        const subscription = yield stripe_1.stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
            payment_behavior: "default_incomplete",
            payment_settings: {
                save_default_payment_method: "on_subscription",
            },
            metadata,
        });
        const latestInvoice = subscription.latest_invoice;
        const invoiceId = typeof latestInvoice === "object" ? latestInvoice.id : latestInvoice;
        let clientSecret = null;
        const invoice = (yield stripe_1.stripe.invoices.retrieve(invoiceId));
        const piRef = invoice.payment_intent;
        if (piRef && typeof piRef === "string") {
            const pi = yield stripe_1.stripe.paymentIntents.retrieve(piRef);
            clientSecret = pi.client_secret;
        }
        else if (piRef && typeof piRef === "object" && piRef.client_secret) {
            clientSecret = piRef.client_secret;
        }
        if (!clientSecret) {
            const paymentIntents = yield stripe_1.stripe.paymentIntents.list({
                customer: customer.id,
                limit: 5,
            });
            const incompletePI = paymentIntents.data.find((p) => p.status === "requires_payment_method" ||
                p.status === "requires_confirmation");
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
        yield payments_model_1.Payment.create({
            amount,
            type: "recurring",
            interval: interval,
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
            issueReceipt: issueReceipt !== null && issueReceipt !== void 0 ? issueReceipt : true,
            receiptSent: false,
        });
        res.status(200).json({
            clientSecret,
            type: "subscription",
        });
    }
    catch (error) {
        console.error("Donation error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        res.status(500).json({ message });
    }
});
exports.createDonation = createDonation;
const sendReceipt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { paymentIntentId, email } = req.body;
        if (!paymentIntentId || !email) {
            res.status(400).json({
                message: "Missing required fields: paymentIntentId, email",
            });
            return;
        }
        const paymentIntent = yield stripe_1.stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
        const charge = paymentIntent.latest_charge;
        const receiptUrl = charge === null || charge === void 0 ? void 0 : charge.receipt_url;
        if (!receiptUrl) {
            res.status(404).json({ message: "Receipt not available yet" });
            return;
        }
        const sent = yield (0, email_service_1.sendStripeReceiptEmail)({
            to: email,
            receiptUrl,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        });
        yield payments_model_1.Payment.findOneAndUpdate({ paymentId: paymentIntentId }, { receiptSent: true, paymentStatus: "succeeded" });
        res.status(200).json({ sent, receiptUrl });
    }
    catch (error) {
        console.error("Send receipt error:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        res.status(500).json({ message });
    }
});
exports.sendReceipt = sendReceipt;
