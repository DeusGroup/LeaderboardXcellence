import { Request } from 'express';
import { z } from 'zod';
import type { Employee, Achievement, PointsHistory } from '@db/schema';

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
  };
}

export const loginRequestSchema = z.object({
  password: z.string().min(1, "Password is required")
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const createEmployeeRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required")
});

export type CreateEmployeeRequest = z.infer<typeof createEmployeeRequestSchema>;

export const awardPointsRequestSchema = z.object({
  employeeId: z.number().int().positive(),
  points: z.number().int(),
  reason: z.string().min(1, "Reason is required")
});

export type AwardPointsRequest = z.infer<typeof awardPointsRequestSchema>;

export const updatePointsRequestSchema = z.object({
  points: z.number().int(),
  reason: z.string().min(1, "Reason is required")
});

export type UpdatePointsRequest = z.infer<typeof updatePointsRequestSchema>;

export type EmployeeResponse = Employee;
export type AchievementResponse = Achievement;
export type PointsHistoryResponse = PointsHistory;
