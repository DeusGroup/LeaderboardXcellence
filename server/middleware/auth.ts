import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Use a fallback secret for development
const JWT_SECRET = process.env.JWT_SECRET || "development-secret-key-change-in-production";

export interface AuthRequest extends Request {
  isAuthenticated?: boolean;
  tokenData?: any;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.authToken;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.isAuthenticated = true;
    req.tokenData = decoded;
    
    // Check token expiration
    const tokenExp = (decoded as any).exp * 1000; // Convert to milliseconds
    if (Date.now() >= tokenExp) {
      return res.status(401).json({ message: "Token has expired" });
    }
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Invalid token" });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token has expired" });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
