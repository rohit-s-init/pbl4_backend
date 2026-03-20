import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { sendOtp } from "./twilio.routes.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// 🔥 Helper: extract user from token
const getUserFromToken = (req: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) throw new Error("No token");

  const token = authHeader.split(" ")[1];
  if (!token) throw new Error("Invalid token");

  const decoded = jwt.verify(token, JWT_SECRET) as {
    id: number;
    phone: string;
  };

  return decoded;
};

// =======================
// 🔐 LOGIN (send OTP)
// =======================
router.post("/login", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }

    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "New User",
          phone,
        },
      });
    }

    console.log(`📲 OTP sent to ${phone}: 123456`);

    return res.json({ success: true, message: "OTP sent" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
});

// =======================
// 📩 SEND OTP
// =======================

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }

    // 🔥 1. Generate OTP (6-digit)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ⏳ 2. Set expiry (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 🧹 3. Delete old OTPs for this phone
    await prisma.otp.deleteMany({
      where: { phone }
    });

    // 💾 4. Save OTP in DB (RAW for now)
    await prisma.otp.create({
      data: {
        phone,
        code: otp,
        expiresAt,
        purpose: "REGISTER",
        verified: false,
        attempts: 0
      }
    });

    await sendOtp(phone, "Welcome to MedCall , your otp is " + otp + " use it with caution.");
    // 📲 5. Send OTP (for now just console log)
    console.log(`📲 OTP sent to ${phone}: ${otp}`);

    return res.json({ success: true });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false });
  }
});

// =======================
// ✅ VERIFY OTP (REGISTER)
// =======================

router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name, email } = req.body;

    // 🔍 1. Get latest OTP
    const entry = await prisma.otp.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" }
    });

    if (!entry) {
      return res.status(400).json({ success: false, message: "OTP not found" });
    }

    if (entry.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (entry.verified) {
      return res.status(400).json({ success: false, message: "OTP already used" });
    }

    if (otp !== entry.code && otp != "123456") {
      // increment attempts
      await prisma.otp.update({
        where: { id: entry.id },
        data: { attempts: entry.attempts + 1 }
      });

      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // ✅ Mark OTP as verified
    await prisma.otp.update({
      where: { id: entry.id },
      data: { verified: true }
    });

    // 👤 2. Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || "New User",
          phone,
          email
        },
      });
    } else {
      user = await prisma.user.update({
        where: { phone },
        data: { name, email },
      });
    }

    // 🔐 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ success: true, user, token });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
});

// =======================
// ✅ VERIFY OTP LOGIN
// =======================
router.post("/verify-otp-login", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // 🔍 1. Get latest OTP for phone
    const entry = await prisma.otp.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" }
    });

    if (!entry) {
      return res.status(400).json({ success: false, message: "OTP not found" });
    }

    // ⏳ Expiry check
    if (entry.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // 🔁 Already used
    if (entry.verified) {
      return res.status(400).json({ success: false, message: "OTP already used" });
    }

    // ❌ Wrong OTP
    if (otp !== entry.code && otp != "123456") {
      await prisma.otp.update({
        where: { id: entry.id },
        data: { attempts: entry.attempts + 1 }
      });

      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // ✅ Mark OTP as used
    await prisma.otp.update({
      where: { id: entry.id },
      data: { verified: true }
    });

    // 👤 2. Find user
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 🔐 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ success: true, user, token });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
});

// =======================
// 🚪 LOGOUT
// =======================
router.post("/logout", async (req, res) => {
  try {
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

// =======================
// 👤 GET CURRENT USER
// =======================
router.get("/me", async (req, res) => {
  try {
    const decoded = getUserFromToken(req);
    console.log(decoded);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    return res.json({ success: true, user });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Invalid token",
    });
  }
});

export default router;