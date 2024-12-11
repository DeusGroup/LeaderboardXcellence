import { Request } from 'express';
import { Employee, Achievement, PointsHistory } from '@db/schema';

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
  };
}

export interface LoginRequest {
  password: string;
}

export interface CreateEmployeeRequest {
  name: string;
  title: string;
  department: string;
}

export interface AwardPointsRequest {
  employeeId: number;
  points: number;
  reason: string;
}

export interface UpdatePointsRequest {
  points: number;
  reason: string;
}

export interface EmployeeResponse extends Employee {}
export interface AchievementResponse extends Achievement {}
export interface PointsHistoryResponse extends PointsHistory {}
