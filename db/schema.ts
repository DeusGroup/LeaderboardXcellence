import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  points: integer("points").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const achievements = pgTable("achievements", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointsRequired: integer("points_required").notNull(),
  badgeImageUrl: text("badge_image_url").notNull()
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
