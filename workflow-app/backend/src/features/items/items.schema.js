import { z } from "zod";
import { PRIORITIES, STATUSES, TYPES } from "../../shared/constants.js";

export const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(""),
  type: z.enum(TYPES),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  teamId: z.number().int().positive(),
  assigneeId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const listSchema = z.object({
  view: z.enum(["assigned", "unassigned_urgent", "awaiting_approval"]).optional(),
  q: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  type: z.enum(TYPES).optional(),
  teamId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const patchSchema = z.object({
  version: z.number().int().positive(), // optimistic concurrency: must match the current version
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
