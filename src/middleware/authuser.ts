import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";


export default async function (req: Request, res: Response, next: NextFunction) {
    try {
        const auth: string | undefined = req.headers.authorization?.split(" ")[1];
        if (!auth) {
            return res.status(401).json({
                status: false,
                message: "please provide jwt webtoken"
            })
        }
        const user = jwt.verify(auth, JWT_SECRET);

        req.user = user;

        next();
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: "internal server error"
        })
    }

}