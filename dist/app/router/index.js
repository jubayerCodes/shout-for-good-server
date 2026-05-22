"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const payments_route_1 = require("../modules/payments/payments.route");
const config_route_1 = require("../modules/config/config.route");
exports.router = (0, express_1.Router)();
const moduleRoutes = [
    {
        path: "/api",
        route: payments_route_1.PaymentRoutes,
    },
    {
        path: "/api/config",
        route: config_route_1.ConfigRoutes,
    },
];
moduleRoutes.forEach((route) => {
    exports.router.use(route.path, route.route);
});
