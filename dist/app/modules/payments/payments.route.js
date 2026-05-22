"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRoutes = void 0;
const express_1 = require("express");
const payments_controller_1 = require("./payments.controller");
exports.PaymentRoutes = (0, express_1.Router)();
exports.PaymentRoutes.post("/donate", payments_controller_1.createDonation);
