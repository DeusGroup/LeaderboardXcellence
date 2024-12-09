import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthRequest extends Request {
  isAuthenticated?: boolean;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    req.isAuthenticated = true;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
