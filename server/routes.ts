import { Express } from "express";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { employees, pointsHistory } from "@db/schema";
import { sql } from "drizzle-orm";

export function registerRoutes(app: Express) {
  // Leaderboard route
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

  // Employee management routes
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

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, parseInt(req.params.id)),
      });
      if (!employee) return res.status(404).json({ error: "Employee not found" });
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  // Points management route
  app.post("/api/points/award", async (req, res) => {
    const { employeeId, points, reason } = req.body;
    try {
      const result = await db.transaction(async (tx) => {
        const [history] = await tx.insert(pointsHistory)
          .values({
            employeeId,
            points,
            reason,
          })
          .returning();

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
      res.status(500).json({ 
        message: "Failed to award points",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/points/history/:employeeId", async (req, res) => {
    try {
      const history = await db.query.pointsHistory.findMany({
        where: eq(pointsHistory.employeeId, parseInt(req.params.employeeId)),
        orderBy: [desc(pointsHistory.createdAt)],
      });
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch points history" });
    }
  });
}