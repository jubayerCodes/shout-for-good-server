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
exports.updateConfig = exports.getConfig = void 0;
const config_model_1 = require("./config.model");
const config_interface_1 = require("./config.interface");
const DEFAULT_CONFIG = {
    donationAmounts: [10, 50, 100],
    recurringOptions: [
        { interval: config_interface_1.IntervalEnum.week, intervalCount: 2, label: "Fortnightly" },
        { interval: config_interface_1.IntervalEnum.month, intervalCount: 1, label: "Monthly" },
    ],
};
const getConfig = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let config = yield config_model_1.Config.findOne();
        if (!config) {
            config = yield config_model_1.Config.create(DEFAULT_CONFIG);
        }
        res.status(200).json(config);
    }
    catch (error) {
        console.error("Get config error:", error);
        res.status(500).json({ message: "Failed to fetch config" });
    }
});
exports.getConfig = getConfig;
const updateConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { donationAmounts, recurringOptions } = req.body;
        if (!donationAmounts || !Array.isArray(donationAmounts)) {
            res
                .status(400)
                .json({ message: "donationAmounts must be an array of numbers" });
            return;
        }
        if (!recurringOptions || !Array.isArray(recurringOptions)) {
            res.status(400).json({
                message: "recurringOptions must be an array of { interval, intervalCount, label }",
            });
            return;
        }
        for (const amt of donationAmounts) {
            if (typeof amt !== "number" || amt < 1) {
                res.status(400).json({ message: "All amounts must be numbers >= 1" });
                return;
            }
        }
        for (const opt of recurringOptions) {
            if (!["week", "month", "year"].includes(opt.interval) ||
                typeof opt.intervalCount !== "number" ||
                opt.intervalCount < 1 ||
                !opt.label) {
                res.status(400).json({
                    message: "Each recurringOption needs: interval (week|month|year), intervalCount (>= 1), label",
                });
                return;
            }
        }
        let config = yield config_model_1.Config.findOne();
        if (config) {
            config.donationAmounts = donationAmounts;
            config.recurringOptions = recurringOptions;
            yield config.save();
        }
        else {
            config = yield config_model_1.Config.create({ donationAmounts, recurringOptions });
        }
        res.status(200).json(config);
    }
    catch (error) {
        console.error("Update config error:", error);
        res.status(500).json({ message: "Failed to update config" });
    }
});
exports.updateConfig = updateConfig;
