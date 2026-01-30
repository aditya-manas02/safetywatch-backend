import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";


import authRoutes from "./routes/auth.js";
import incidentRoutes from "./routes/incidents.js";
import userRoutes from "./routes/userRoutes.js";
import statsRoutes from "./routes/stats.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ----------------------- LOGGING ------------------------ */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/api/health-test", (req, res) => {
  res.json({ message: "Direct health-test route is working", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/support", supportRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "SafetyWatch API running (v1.0.1)", timestamp: new Date().toISOString() });
});

/* ----------------------- ERROR HANDLING ------------------- */
// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
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

  