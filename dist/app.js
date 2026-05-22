"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const cors = require("cors");
const router_1 = require("./app/router");
const app = express();
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
}));
app.use(express.json());
app.use("/", router_1.router);
app.get("/", (_req, res) => {
    res.status(200).json({ message: "Shout For Good Server is running!" });
});
exports.default = app;
