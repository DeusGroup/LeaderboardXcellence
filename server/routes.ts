import { Express } from "express";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { employees, achievements, employeeAchievements, pointsHistory } from "@db/schema";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { requireAuth } from "./middleware/auth";
import multer from "multer";
import path from "path";

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

export function registerRoutes(app: Express) {
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    
    if (password === "Welcome1") {
      const token = jwt.sign({}, process.env.JWT_SECRET || "your-secret-key", {
        expiresIn: "24h",
      });
      
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      res.json({ message: "Logged in successfully" });
    } else {
      res.status(401).json({ message: "Invalid password" });
    }
  });

  app.get("/api/auth/check", requireAuth, (req, res) => {
    res.json({ message: "Authenticated" });
  });

  app.get("/api/leaderboard", async (req, res) => {
    const leaderboard = await db.query.employees.findMany({
      orderBy: [desc(employees.points)],
    });
    res.json(leaderboard);
  });

  app.get("/api/employees/:id", async (req, res) => {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, parseInt(req.params.id)),
    });
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  });

  app.put("/api/employees/:id", requireAuth, upload.single('image'), async (req, res) => {
    const { name, title, department } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    
    try {
      const [updated] = await db
        .update(employees)
        .set({ 
          name, 
          title, 
          department,
          ...(imageUrl && { imageUrl })
        })
        .where(eq(employees.id, parseInt(req.params.id)))
        .returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.post("/api/points/award", requireAuth, async (req, res) => {
    const { employeeId, points, reason } = req.body;
    
    // Start a transaction to ensure both operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      const [history] = await tx.insert(pointsHistory).values({
        employeeId,
        points,
        reason,
        awardedBy: 1, // TODO: Get from session
      }).returning();

      const [updated] = await tx
        .update(employees)
        .set({
          points: sql`${employees.points} + ${points}`
        })
        .where(eq(employees.id, employeeId))
        .returning();

      return { history, updated };
    });

    res.json(result);
  });

  app.get("/api/points/history/:employeeId", async (req, res) => {
    const history = await db.query.pointsHistory.findMany({
      where: eq(pointsHistory.employeeId, parseInt(req.params.employeeId)),
      orderBy: [desc(pointsHistory.createdAt)],
    });
    res.json(history);
  });

  app.get("/api/achievements/:employeeId", async (req, res) => {
    // Get all achievements
    const allAchievements = await db.query.achievements.findMany();
    
    // Get employee's earned achievements
    const earnedAchievements = await db.query.employeeAchievements.findMany({
      where: eq(employeeAchievements.employeeId, parseInt(req.params.employeeId)),
    });

    // Combine the data
    const achievementsWithStatus = allAchievements.map(achievement => {
      const earned = earnedAchievements.find(
        earned => earned.achievementId === achievement.id
      );
      return {
        ...achievement,
        earnedAt: earned ? earned.earnedAt : null
      };
    });

    res.json(achievementsWithStatus);
  });
}
