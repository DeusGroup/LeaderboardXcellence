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
    try {
      const { password } = req.body;
      
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ 
          status: 'error',
          message: "Password is required and must be a string" 
        });
      }

      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Welcome1";
      if (password === ADMIN_PASSWORD) {
        const token = jwt.sign(
          {},
          process.env.JWT_SECRET || "development-secret-key-change-in-production",
          { expiresIn: "24h" }
        );
        
        res.cookie("authToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        
        return res.json({ 
          status: 'success',
          message: "Logged in successfully" 
        });
      }
      
      return res.status(401).json({ 
        status: 'error',
        message: "Invalid password" 
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ 
        status: 'error',
        message: "Internal server error during login" 
      });
    }
  });

  app.get("/api/auth/check", requireAuth, (req, res) => {
    res.json({ message: "Authenticated" });
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      console.log('[Leaderboard] Fetching leaderboard data');
      const leaderboard = await db.select()
        .from(employees)
        .orderBy(desc(employees.points));
      console.log(`[Leaderboard] Found ${leaderboard.length} employees`);
      res.json(leaderboard);
    } catch (error) {
      console.error('[Leaderboard] Error:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  app.post("/api/employees", requireAuth, async (req, res) => {
    try {
      const { name, title, department } = req.body;
      
      // Input validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ 
          status: 'error',
          message: "Name is required and must be a non-empty string" 
        });
      }
      
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ 
          status: 'error',
          message: "Title is required and must be a non-empty string" 
        });
      }
      
      if (!department || typeof department !== 'string' || department.trim().length === 0) {
        return res.status(400).json({ 
          status: 'error',
          message: "Department is required and must be a non-empty string" 
        });
      }

      // Create employee with sanitized inputs
      const [employee] = await db.insert(employees)
        .values({ 
          name: name.trim(),
          title: title.trim(), 
          department: department.trim() 
        })
        .returning();

      return res.status(201).json({
        status: 'success',
        data: employee
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      
      if (error instanceof Error) {
        // Handle specific database errors
        if (error.message.includes('unique constraint')) {
          return res.status(409).json({ 
            status: 'error',
            message: "An employee with this information already exists" 
          });
        }
      }
      
      return res.status(500).json({ 
        status: 'error',
        message: "Failed to create employee" 
      });
    }
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

  app.delete("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const [deleted] = await db
        .delete(employees)
        .where(eq(employees.id, parseInt(req.params.id)))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  app.post("/api/points/award", requireAuth, async (req, res) => {
    const { employeeId, points, reason } = req.body;
    
    try {
      // Check if employee exists before awarding points
      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, employeeId)
      });

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Start a transaction to ensure both operations succeed or fail together
      const result = await db.transaction(async (tx) => {
        const [history] = await tx.insert(pointsHistory).values({
          employeeId,
          points,
          reason,
          awardedBy: 2, // Using known valid employee ID
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
    } catch (error) {
      console.error('Error awarding points:', error);
      res.status(500).json({ 
        message: "Failed to award points",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/points/:historyId", requireAuth, async (req, res) => {
    const { points, reason } = req.body;
    const historyId = parseInt(req.params.historyId);
    
    try {
      // Start a transaction to ensure both operations succeed or fail together
      const result = await db.transaction(async (tx) => {
        // Get the old points history record
        const [oldHistory] = await tx
          .select()
          .from(pointsHistory)
          .where(eq(pointsHistory.id, historyId));

        if (!oldHistory) {
          throw new Error("Points history record not found");
        }

        // Get current employee points
        const [employee] = await tx
          .select()
          .from(employees)
          .where(eq(employees.id, oldHistory.employeeId));

        if (!employee) {
          throw new Error("Employee not found");
        }

        // Calculate points difference
        const pointsDiff = points - oldHistory.points;

        // Check if update would result in negative points
        if (employee.points + pointsDiff < 0) {
          throw new Error("Cannot update points: would result in negative balance");
        }

        // Update the points history record
        const [history] = await tx
          .update(pointsHistory)
          .set({ points, reason })
          .where(eq(pointsHistory.id, historyId))
          .returning();

        // Update employee's total points
        const [updated] = await tx
          .update(employees)
          .set({
            points: sql`${employees.points} + ${pointsDiff}`
          })
          .where(eq(employees.id, oldHistory.employeeId))
          .returning();

        return { history, updated };
      });

      res.json(result);
    } catch (error) {
      console.error('Error updating points:', error);
      res.status(400).json({ 
        message: "Failed to update points",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/points/:historyId", requireAuth, async (req, res) => {
    const historyId = parseInt(req.params.historyId);
    
    // Start a transaction to ensure both operations succeed or fail together
    const result = await db.transaction(async (tx) => {
      // Get the points history record
      const [history] = await tx
        .select()
        .from(pointsHistory)
        .where(eq(pointsHistory.id, historyId));

      if (!history) {
        throw new Error("Points history record not found");
      }

      // Get current employee points
      const [employee] = await tx
        .select()
        .from(employees)
        .where(eq(employees.id, history.employeeId));

      if (!employee) {
        throw new Error("Employee not found");
      }

      // Check if deletion would result in negative points
      if (employee.points < history.points) {
        throw new Error("Cannot delete points: would result in negative balance");
      }

      // Update employee's total points by subtracting the points
      await tx
        .update(employees)
        .set({
          points: sql`${employees.points} - ${history.points}`
        })
        .where(eq(employees.id, history.employeeId));

      // Delete the points history record
      await tx
        .delete(pointsHistory)
        .where(eq(pointsHistory.id, historyId));

      return history;
    });

    res.json({ message: "Points history deleted successfully", deletedRecord: result });
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
