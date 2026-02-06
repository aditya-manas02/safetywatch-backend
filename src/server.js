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
import aiChatRoutes from "./routes/aiChatRoutes.js";
import newsRoutes from "./routes/news.js";
import areaCodeRoutes from "./routes/areaCodeRoutes.js";

dotenv.config();
const app = express();

/* ----------------------- CORS & PREFLIGHT ----------------------- */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://safetywatch.vercel.app",
  "http://localhost",
  "capacitor://localhost"
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(ao => origin === ao)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Rejected origin: ${origin}`);
        callback(null, true); // Temporarily allow ALL in production to debug "Failed to fetch"
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-app-version"],
    credentials: true,
  })
);

// IMPORTANT: handle preflight before any limiting
app.options("*", cors());

/* ----------------------- VERSION ENFORCEMENT ----------------------- */
// Discontinue legacy versions (< 1.3.4) by requiring a header
app.use((req, res, next) => {
  // Skip version check for health checks and non-api routes
  if (req.url === '/ping' || req.url === '/' || req.url.startsWith('/api/health')) {
    return next();
  }

  /* 
   * LEGACY COMPATIBILITY MODE:
   * RESTORED MIN_VERSION to '1.3.4' to correctly guide updated clients.
   * FIX: We now explicitly ALLOW requests with missing `x-app-version` headers.
   * Why? Legacy apps (v1.3.3) do NOT send this header.
   * By returning `false` (not outdated) for missing headers, we allow them to connect (200 OK).
   * This bypasses the backend 426 block (preventing Red Toasts/Crashes).
   * The blocking responsiblity is transferred to the client-side `AppUpdateOverlay`.
   */
  const MIN_VERSION = '1.3.4';

  // Helper function for simple semver comparison (v1, v2 strings like '1.3.4')
  const isOutdated = (current, min) => {
    // CRITICAL FIX: If header is missing, assume it's a legacy app and ALLOW it (return false).
    // This pushes the blocking responsibility to the frontend UI.
    if (!current) return false; 
    
    // Normalize: remove 'v' prefix if present
    const currClean = current.replace(/^v/, '');
    const minClean = min.replace(/^v/, '');
    
    const c = currClean.split('.').map(Number);
    const m = minClean.split('.').map(Number);
    
    // Ensure we have at least 3 parts for comparison
    while (c.length < 3) c.push(0);
    while (m.length < 3) m.push(0);

    for (let i = 0; i < 3; i++) {
        const cv = isNaN(c[i]) ? 0 : c[i];
        const mv = isNaN(m[i]) ? 0 : m[i];
        if (cv < mv) return true;
        if (cv > mv) return false;
    }
    return false;
  };

  if (isOutdated(appVersion, MIN_VERSION)) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const origin = req.headers['origin'] || 'Unknown';
    console.warn(`[VERSION_REJECTED] App: ${appVersion || 'None'} | Min: ${MIN_VERSION} | UA: ${userAgent} | Origin: ${origin} | IP: ${req.ip}`);
    
    return res.status(426).json({ 
      error: "Upgrade Required",
      message: `SafetyWatch Update Required: Your version (${appVersion || 'legacy'}) is discontinued. Please download the latest version v${MIN_VERSION} here: https://safetywatch.vercel.app/SafetyWatch.apk`,
      currentVersion: appVersion,
      requiredVersion: MIN_VERSION,
      downloadUrl: "https://safetywatch.vercel.app/SafetyWatch.apk"
    });
  }
  next();
});

/* ----------------------- SECURITY & LIMITING ----------------------- */
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // relaxed for production dashboard concurrency
  message: "Too many requests from this IP, please try again later. Dashboard traffic detected - limit increased.",
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
app.use("/api/chat", aiChatRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/area-codes", areaCodeRoutes);

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



  