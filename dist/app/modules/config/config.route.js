"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigRoutes = void 0;
const express_1 = require("express");
const config_controllers_1 = require("./config.controllers");
exports.ConfigRoutes = (0, express_1.Router)();
exports.ConfigRoutes.get("/", config_controllers_1.getConfig);
exports.ConfigRoutes.put("/", config_controllers_1.updateConfig);
