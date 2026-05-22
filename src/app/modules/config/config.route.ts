import { Router } from "express";
import { getConfig, updateConfig } from "./config.controllers";

export const ConfigRoutes = Router();

ConfigRoutes.get("/", getConfig);
ConfigRoutes.put("/", updateConfig);