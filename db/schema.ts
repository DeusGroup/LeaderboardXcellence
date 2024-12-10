import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Core employee schema with only essential fields
export const employees = pgTable("employees", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Simple points history tracking
export const pointsHistory = pgTable("points_history", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Zod schemas for validation
export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = z.infer<typeof selectEmployeeSchema>;

export const insertPointsHistorySchema = createInsertSchema(pointsHistory);
export const selectPointsHistorySchema = createSelectSchema(pointsHistory);
export type InsertPointsHistory = z.infer<typeof insertPointsHistorySchema>;
export type PointsHistory = z.infer<typeof selectPointsHistorySchema>;
