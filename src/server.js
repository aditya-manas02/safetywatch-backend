import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";

import authRoutes from "./routes/auth.js";
import incidentRoutes from "./routes/incidents.js";
import userRoutes from "./routes/userRoutes.js";
import statsRoutes from "./routes/stats.js";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();
const app = express();

/* ----------------------- SECURITY ----------------------- */
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

/* ----------------------- CORS ----------------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:8080", "https://safetywatch.vercel.app"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// IMPORTANT: handle preflight
app.options("*", cors());

/* ----------------------- BODY ----------------------- */
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ----------------------- ROUTES --------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.send("SafetyWatch API running");
});

/* ----------------------- DATABASE ------------------------- */
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Mongo connected");
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("Mongo DB connection error:", err);
    console.error("MONGO_URI exists:", !!MONGO_URI);
    console.error("Error details:", err.message);
    // Give time for logs to flush before exiting
    setTimeout(() => process.exit(1), 1000);
  });

  