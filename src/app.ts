const express = require("express");
const cors = require("cors");
import type { Request, Response } from "express";
import { router } from "./app/router";

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/", router);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Shout For Good Server is running!" });
});

export default app;
