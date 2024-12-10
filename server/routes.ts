import { Express } from "express";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { employees, pointsHistory } from "@db/schema";
import { sql } from "drizzle-orm";

export function registerRoutes(app: Express) {
  // Core routes for the leaderboard system
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await db.query.employees.findMany({
        orderBy: [desc(employees.points)],
      });
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Add employee
  app.post("/api/employees", async (req, res) => {
    const { name, title, department } = req.body;
    try {
      const [employee] = await db.insert(employees)
        .values({ name, title, department })
        .returning();
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  // Award points
  app.post("/api/points/award", async (req, res) => {
    const { employeeId, points, reason } = req.body;
    try {
      const result = await db.transaction(async (tx) => {
        // Record points history
        const [history] = await tx.insert(pointsHistory)
          .values({ employeeId, points, reason })
          .returning();

        // Update employee points
        const [updated] = await tx
          .update(employees)
          .set({ points: sql`${employees.points} + ${points}` })
          .where(eq(employees.id, employeeId))
          .returning();

        return { history, updated };
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to award points" });
    }
  });
}