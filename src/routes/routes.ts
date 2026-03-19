import express from "express";

import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import scheduleRoutes from "./schedule.routes.js";
import callRoutes from "./call.routes.js";
import twilioRoutes from "./twilio.routes.js";

const router = express.Router();

// =======================
// 🔐 AUTH ROUTES
// =======================
router.use("/auth", authRoutes);

// =======================
// 👤 USER ROUTES
// =======================
router.use("/user", userRoutes);

// =======================
// 📅 SCHEDULE ROUTES
// =======================
router.use("/schedules", scheduleRoutes);

// =======================
// 📞 CALL ROUTES
// =======================
router.use("/calls", callRoutes);

// =======================
// ☎️ TWILIO ROUTES
// =======================
router.use("/twilio", twilioRoutes);

// =======================
// 🧪 HEALTH CHECK (optional but useful)
// =======================
router.get("/health", (req, res) => {
  res.json({ success: true, message: "API is running 🚀" });
});

export default router;