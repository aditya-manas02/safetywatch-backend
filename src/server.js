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
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();
const app = express();

/* ----------------------- CORS & PREFLIGHT ----------------------- */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:8080", "https://safetywatch.vercel.app"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// IMPORTANT: handle preflight before any limiting
app.options("*", cors());

/* ----------------------- SECURITY & LIMITING ----------------------- */
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // increased for dashboard use
  message: "Too many requests from this IP, please try again later.",
  skip: (req) => req.method === "OPTIONS", // Ensure preflights are NEVER blocked
});
app.use(limiter);

/* ----------------------- BODY ----------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ----------------------- LOGGING ------------------------ */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.get("/api/health-test", (req, res) => {
  res.json({ message: "Direct health-test route is working", timestamp: new Date().toISOString() });
});

app.get("/api/debug-ping", (req, res) => {
  res.json({
    status: "alive",
    version: "1.0.8",
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SET: !!process.env.JWT_SECRET,
      MONGO_SET: !!process.env.MONGO_URI,
    },
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "SafetyWatch API running (v1.0.7)", timestamp: new Date().toISOString() });
});

/* ----------------------- ERROR HANDLING ------------------- */
// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }
  
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

/* ----------------------- DATABASE ------------------------- */
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

const connectWithRetry = () => {
  console.log("Attempting MongoDB connection...");
  mongoose
    .connect(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err.message);
      console.log("Retrying in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Listen for connection events for better visibility
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Reconnection will be handled by connectWithRetry or Mongoose auto-reconnect.");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB runtime error:", err.message);
});

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);

/* ----------------------- PROCESS HANDLERS ----------------- */
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Optional: Graceful shutdown or monitoring integration
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception critically handled:", err.message);
  console.error(err.stack);
  
  // It is generally safer to restart the process on uncaughtException
  // especially if it's in a corrupted state.
  console.log("Gracefully shutting down due to uncaught exception...");
  process.exit(1);
});



  