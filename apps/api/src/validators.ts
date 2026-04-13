import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1),
  payrollNumber: z.string().min(1).optional(),
  legalName: z.string().min(2),
  preferredName: z.string().min(1).optional(),
  companyEmail: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  hireDate: z.string().datetime().or(z.string().date()),
  departmentId: z.string().optional(),
  branchId: z.string().optional(),
  positionId: z.string().optional(),
  gradeId: z.string().optional(),
  costCenterId: z.string().optional()
});

export const createCandidateSchema = z.object({
  vacancyId: z.string().optional(),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).optional(),
  source: z.string().optional(),
  salaryExpectation: z.number().nonnegative().optional(),
  noticePeriod: z.string().optional(),
  notes: z.string().optional()
});

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
  days: z.number().positive(),
  reason: z.string().optional()
});

export const approvalDecisionSchema = z.object({
  comments: z.string().optional()
});
