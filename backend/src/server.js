import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";

// Routes
import authRoutes from "./routes/auth.js";
import incidentRoutes from "./routes/incidents.js";
import userRoutes from "./routes/userRoutes.js";
import statsRoutes from "./routes/stats.js";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();
const app = express();

/* ----------------------- MIDDLEWARE ----------------------- */
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ----------------------- ROUTES --------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/upload", uploadRoutes);

// ❌ REMOVED (These caused server crash)
// app.use("/api/groups", groupsRoutes);
// app.use("/api/groups", groupRoutes);

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
    process.exit(1);
  });
