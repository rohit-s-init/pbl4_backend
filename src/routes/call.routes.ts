import { prisma } from "../lib/prisma.js";
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// 🔥 helper (same as previous file)
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
// 📞 GET ALL CALLS
// =======================
router.get("/", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);

    const calls = await prisma.call.findMany({
      where: {
        schedule: {
          userId: userId,
        },
      },
      include: {
        schedule: true,
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    return res.json({ success: true, calls });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

// =======================
// 📊 GET RESPONSES
// =======================
router.get("/responses", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);

    const responses = await prisma.response.findMany({
      where: {
        call: {
          schedule: {
            userId: userId,
          },
        },
      },
      include: {
        call: {
          include: {
            schedule: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    return res.json({ success: true, responses });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

// =======================
// 📞 GET CALL BY ID (secure)
// =======================
router.get("/:id", async (req, res) => {
  try {
    const { id: userId } = getUserFromToken(req);
    const id = Number(req.params.id);

    const call = await prisma.call.findFirst({
      where: {
        id,
        schedule: {
          userId: userId, // 🔥 ensures ownership
        },
      },
      include: {
        schedule: true,
        responses: true,
      },
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    return res.json({ success: true, call });

  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: err.message || "Unauthorized",
    });
  }
});

export default router;