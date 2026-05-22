import { Request, Response } from "express";
import { Config } from "./config.model";
import { IntervalEnum } from "./config.interface";

// Default config to seed if none exists
const DEFAULT_CONFIG = {
  donationAmounts: [10, 50, 100],
  recurringOptions: [
    { interval: IntervalEnum.week, intervalCount: 2, label: "Fortnightly" },
    { interval: IntervalEnum.month, intervalCount: 1, label: "Monthly" },
  ],
};

/**
 * GET /api/config
 * Returns the donation config. Seeds a default if none exists.
 */
export const getConfig = async (_req: Request, res: Response) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create(DEFAULT_CONFIG);
    }
    res.status(200).json(config);
  } catch (error) {
    console.error("Get config error:", error);
    res.status(500).json({ message: "Failed to fetch config" });
  }
};

/**
 * PUT /api/config
 * Updates the donation config (upsert — creates if not found).
 */
export const updateConfig = async (req: Request, res: Response) => {
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
        message:
          "recurringOptions must be an array of { interval, intervalCount, label }",
      });
      return;
    }

    // Validate amounts are positive numbers
    for (const amt of donationAmounts) {
      if (typeof amt !== "number" || amt < 1) {
        res.status(400).json({ message: "All amounts must be numbers >= 1" });
        return;
      }
    }

    // Validate recurring options
    for (const opt of recurringOptions) {
      if (
        !["week", "month", "year"].includes(opt.interval) ||
        typeof opt.intervalCount !== "number" ||
        opt.intervalCount < 1 ||
        !opt.label
      ) {
        res.status(400).json({
          message:
            "Each recurringOption needs: interval (week|month|year), intervalCount (>= 1), label",
        });
        return;
      }
    }

    let config = await Config.findOne();
    if (config) {
      config.donationAmounts = donationAmounts;
      config.recurringOptions = recurringOptions;
      await config.save();
    } else {
      config = await Config.create({ donationAmounts, recurringOptions });
    }

    res.status(200).json(config);
  } catch (error) {
    console.error("Update config error:", error);
    res.status(500).json({ message: "Failed to update config" });
  }
};