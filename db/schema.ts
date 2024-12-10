import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  specialization: text("specialization").notNull().default('backend'), // e.g., 'backend', 'devops', 'security', 'frontend'
  level: text("level").notNull().default('junior'), // e.g., 'junior', 'mid', 'senior', 'lead'
  points: integer("points").notNull().default(0),
  monthlyPoints: integer("monthly_points").notNull().default(0), // Track monthly performance
  streak: integer("streak").notNull().default(0), // Consecutive days of activity
  isAdmin: boolean("is_admin").notNull().default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const achievements = pgTable("achievements", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default('technical'), // 'technical', 'leadership', 'innovation', 'security', 'reliability'
  tier: integer("tier").notNull().default(1), // 1-5 for achievement levels
  pointsRequired: integer("points_required").notNull().default(100),
  requirements: text("requirements").notNull().default('Complete task requirements'), // Specific criteria to earn
  badgeImageUrl: text("badge_image_url").notNull(),
  bonusPoints: integer("bonus_points").default(0).notNull() // Extra points awarded for achieving
});

export const employeeAchievements = pgTable("employee_achievements", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull()
});

export const pointsHistory = pgTable("points_history", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  category: text("category").notNull().default('project_completion'), // 'incident_resolution', 'project_completion', 'knowledge_sharing', 'uptime', 'security', 'innovation'
  details: text("details"), // Additional context about the achievement
  projectId: text("project_id"), // Optional reference to specific project/ticket
  awardedBy: integer("awarded_by").references(() => employees.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = z.infer<typeof selectEmployeeSchema>;

export const insertAchievementSchema = createInsertSchema(achievements);
export const selectAchievementSchema = createSelectSchema(achievements);
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = z.infer<typeof selectAchievementSchema>;

export const insertPointsHistorySchema = createInsertSchema(pointsHistory);
export const selectPointsHistorySchema = createSelectSchema(pointsHistory);
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = z.infer<typeof selectPointsHistorySchema>;
