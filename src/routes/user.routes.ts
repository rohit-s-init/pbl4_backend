import { prisma } from "../lib/prisma.js";
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// 🔥 helper
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
// 👤 GET USER PROFILE
// =======================
router.get("/profile", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        schedules: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({ success: true, user });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

// =======================
// ✏️ UPDATE USER PROFILE
// =======================
router.put("/profile", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);
    const { name, email } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
    });

    return res.json({ success: true, user: updatedUser });

  } catch (err: any) {
    console.error(err);

    if (err.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

export default router;