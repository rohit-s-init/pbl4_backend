import express from "express";
import { prisma } from "../lib/prisma.js";
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
// 📅 GET ALL SCHEDULES
// =======================
router.get("/", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);

    const schedules = await prisma.schedule.findMany({
      where: { userId },
      orderBy: { time: "asc" },
    });

    return res.json({ success: true, schedules });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

// =======================
// ➕ CREATE SCHEDULE
// =======================
router.post("/", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);
    const { message, time, label, isActive } = req.body;

    if (!message || !time || !label) {
      return res.status(400).json({
        success: false,
        message: "message, time, label required",
      });
    }

    const schedule = await prisma.schedule.create({
      data: {
        message,
        time,
        label,
        isActive: isActive ?? true,
        userId, // 🔥 from JWT (NOT from body)
      },
    });

    return res.json({ success: true, schedule });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

// =======================
// ✏️ UPDATE SCHEDULE (secure)
// =======================
router.put("/:id", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);
    const id = Number(req.params.id);
    const updates = req.body;

    // 🔐 check ownership first
    const existing = await prisma.schedule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: updates,
    });

    return res.json({ success: true, schedule });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

// =======================
// 🗑️ DELETE SCHEDULE (secure)
// =======================
router.delete("/:id", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);
    const id = Number(req.params.id);

    const existing = await prisma.schedule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    await prisma.schedule.delete({
      where: { id },
    });

    return res.json({ success: true });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

// =======================
// 🔁 TOGGLE ACTIVE STATUS (secure)
// =======================
router.patch("/:id/toggle", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);
    const id = Number(req.params.id);

    const existing = await prisma.schedule.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
      },
    });

    return res.json({ success: true, schedule: updated });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

export default router;