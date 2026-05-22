import { Router } from "express";
import { createDonation, sendReceipt } from "./payments.controller";

export const PaymentRoutes = Router();

PaymentRoutes.post("/donate", createDonation);
PaymentRoutes.post("/send-receipt", sendReceipt);
