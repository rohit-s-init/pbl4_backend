import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

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

    console.log(`📲 OTP sent to ${phone}: 123456`);

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

    if (otp !== "123456") {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { name: name || "New User", phone, email },
      });
    } else {
      user = await prisma.user.update({
        where: { phone },
        data: { name, email },
      });
    }

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

    if (otp !== "123456") {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

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