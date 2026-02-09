import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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

// Robust CORS with explicit fallback for mobile/native origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.includes(origin) || 
                       origin.includes("vercel.app") || 
                       origin.includes("localhost") ||
                       origin.startsWith("capacitor://");

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Potentially blocked origin: ${origin}`);
        callback(null, true); // Temporarily allow ALL in production to solve "Failed to fetch"
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-app-version"],
    credentials: true,
  })
);

// handle preflight
app.options("*", cors());

/* ----------------------- VERSION ENFORCEMENT ----------------------- */
// Discontinue legacy versions (< 1.3.4) by requiring a header
app.use((req, res, next) => {
  // Use req.path to ignore query parameters
  const path = req.path;

  // NUCLEAR BYPASS: Allow OPTIONS preflight and absolute minimum required routes
  const isPublicRoute = 
    req.method === 'OPTIONS' ||
    path === '/ping' || 
    path === '/' || 
    path.startsWith('/api/health') || 
    path === '/SafetyWatch.apk' ||
    path.includes('/version.json');

  if (isPublicRoute) {
    return next();
  }

  /* 
   * STRICT ENFORCEMENT MODE:
   * We set MIN_VERSION to '1.4.3' to ensure all old APKs are blocked.
   * Sending status 426 Upgrade Required.
   */
  const MIN_VERSION = '1.4.3';
  
  // Helper function for simple semver comparison
  const isOutdated = (current, min) => {
    // If header is missing, treat as outdated (v1.3.3 or below)
    if (!current) return true; 
    
    // Clean version strings (remove - prefixes or v prefixes)
    const currClean = current.replace(/^v/, '').split('-')[0];
    const minClean = min.replace(/^v/, '').split('-')[0];
    
    const c = currClean.split('.').map(Number);
    const m = minClean.split('.').map(Number);
    
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

  const appVersion = req.headers['x-app-version'];
  const origin = (req.headers['origin'] || '').toLowerCase();
  const referer = (req.headers['referer'] || '').toLowerCase();
  const xRequestedWith = (req.headers['x-requested-with'] || '').toLowerCase();
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();

  // EXEMPTION LOGIC: Skip check for standard web browsers
  // We want to exempt anything that looks like a browser hits from Vercel or localhost
  const isWebDomain = origin.includes('vercel.app') || 
                      origin.includes('safetywatch.live') ||
                      referer.includes('vercel.app') ||
                      referer.includes('safetywatch.live');
  
  const isLocalBrowser = origin.includes('localhost:') || 
                        origin.includes('127.0.0.1:') ||
                        referer.includes('localhost:') ||
                        referer.includes('127.0.0.1:');

  // Explicit Native Markers (Capacitor/Native Shell)
  const isExplicitNative = xRequestedWith === 'com.safetywatch.app' || 
                           origin.startsWith('capacitor://') ||
                           userAgent.includes('capacitor');

  // If it's a web domain and NOT explicitly a native shell, allow it
  const isWebBrowser = (isWebDomain || isLocalBrowser) && !isExplicitNative;

  if (isWebBrowser) {
    return next();
  }


  if (isOutdated(appVersion, MIN_VERSION)) {
    console.warn(`[VERSION_BLOCK] User blocked: ${appVersion || 'none'} | Path: ${path} | Origin: ${origin} | Referer: ${referer}`);
    const upgradeMsg = "Update Required (426) - Please download v1.4.3";
    return res.status(426).json({
      message: upgradeMsg,
      error: upgradeMsg,
      name: "VersionError",
      status: 426,
      debug: {
        path: path,
        received: appVersion || "none",
        origin: origin || "none",
        referer: referer || "none",
        isWeb: isWebBrowser
      }
    });
  }
  next();
});

/* ----------------------- SECURITY & LIMITING ----------------------- */
// Relax Helmet policies to allow cross-origin interaction
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

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
app.use(express.static('public')); // Serve APK and other static assets

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

// CHUNKED APK DELIVERY: Stream the APK parts as a single file to bypass hosting size limits
app.get("/SafetyWatch.apk", (req, res) => {
  const apkPath = path.join(__dirname, '../public/SafetyWatch.apk');
  const parts = [
    path.join(__dirname, '../public/SafetyWatch.apk.part1'),
    path.join(__dirname, '../public/SafetyWatch.apk.part2'),
    path.join(__dirname, '../public/SafetyWatch.apk.part3')
  ];

  // PRIORITY: Serve full APK if it exists (most robust)
  if (fs.existsSync(apkPath)) {
    console.log(`[APK_DOWNLOAD] Sending full APK via res.download to ${req.ip}`);
    return res.download(apkPath, 'SafetyWatch.apk', {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
      }
    });
  }

  // FALLBACK: Stream parts if full APK is missing
  if (!fs.existsSync(parts[0])) {
    return res.status(404).json({ message: "APK not found. Please wait for deployment to complete." });
  }

  console.log(`[APK_DOWNLOAD] Streaming reassembled APK to ${req.ip}`);
  res.setHeader('Content-Disposition', 'attachment; filename="SafetyWatch.apk"');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');

  // CRITICAL: Set Content-Length to avoid "stuck at 100%" in mobile browsers
  try {
    let totalSize = 0;
    parts.forEach(part => {
      if (fs.existsSync(part)) {
        totalSize += fs.statSync(part).size;
      }
    });

    if (totalSize > 0) {
      res.setHeader('Content-Length', totalSize);
    }

    parts.forEach(part => {
      const data = fs.readFileSync(part);
      res.write(data);
    });
    res.end();
  } catch (err) {
    console.error("[APK_DOWNLOAD_ERROR]", err);
    if (!res.headersSent) {
      res.status(500).end();
    } else {
      res.end();
    }
  }
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

app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    message: "Server is healthy",
    uptime: process.uptime(),
    minVersion: '1.4.2'
  });
});

app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "SafetyWatch API running (v1.4.2)", timestamp: new Date().toISOString() });
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



  