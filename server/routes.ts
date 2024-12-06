import type { Express } from "express";
import { db } from "../db";
import { employees, achievements, pointsHistory, employeeAchievements } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

export function registerRoutes(app: Express) {
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

  app.put("/api/employees/:id", async (req, res) => {
    const { name, title, department } = req.body;
    try {
      const [updated] = await db
        .update(employees)
        .set({ name, title, department })
        .where(eq(employees.id, parseInt(req.params.id)))
        .returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.post("/api/points/award", async (req, res) => {
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
