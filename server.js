import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import session from "express-session";
import passport from "passport";
import { fileURLToPath } from "url";
import pool from "./config/db.js";

// Load environment variables
dotenv.config();

// Express app
const app = express();

// --------------------
// UPDATED CORS SETUP
// --------------------
// Is setup se har origin allow ho jayegi aur credentials (sessions) bhi kaam karenge
app.use(
  cors({
    origin: (origin, callback) => {
      // Har request ko allow karne ke liye true return kar rahe hain
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔥 IMPORTANT: Increase body size limit for base64 image
app.use(express.json({ limit: "100mb" })); 
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Session setup
app.use(
  session({
    secret: process.env.JWT_SECRET || "secretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Production mein true rakhein
      sameSite: "lax",
    },
  })
);

// Validate required OAuth env vars
const requiredEnvVars = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  JWT_SECRET: process.env.JWT_SECRET,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingVars.join(", "));
  process.exit(1);
}

// Init passport strategies
import "./config/passport.js";
app.use(passport.initialize());
app.use(passport.session());

// --------------------
// STATIC FILE FIX
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

console.log("📁 Serving uploads from:", path.join(__dirname, "uploads"));

// --------------------
// DB Connection Test
// --------------------
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ MySQL Connected Successfully");
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err.message);
    process.exit(1);
  }
})();

// --------------------
// ROUTES
// --------------------
import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import meetingsRoutes from "./routes/meetingsRoutes.js";
import photosRoutes from "./routes/photosRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import socialAuthRoutes from "./routes/socailRoutes.js";
import userRoutes from "./routes/usersRoutes.js";
import assigment from "./routes/assignmentRoutes.js";
import account from "./routes/accountRoutes.js";
import trapsRoutes from "./routes/trapRoutes.js";
import insectRoutes from "./routes/insectRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import insectPopulationRoutes from "./routes/insectPopulationRoutes.js";

// Mount routes
app.use("/api/auth", socialAuthRoutes);
app.use("/api/account", account);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/meetings", meetingsRoutes);
app.use("/api/photos", photosRoutes);
app.use("/api/users", authRoutes);
app.use("/api/company-users", userRoutes);
app.use("/api/assigment-users", assigment);
app.use("/api/trap", trapsRoutes);
app.use("/api/insect", insectRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/insectPopulation", insectPopulationRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("🚀 PestIQ Backend running successfully!");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`⚡ Server running on port ${PORT}`));