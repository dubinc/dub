import * as z from "zod/v4";
import { UserSchema } from "./users";

export const getActivityLogsQuerySchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
});

const fieldDiffSchema = z.object({
  old: z.unknown().nullable(),
  new: z.unknown().nullable(),
});

export const activityLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  description: z.string().nullable(),
  changeSet: z.record(z.string(), fieldDiffSchema),
  createdAt: z.date(),
  user: UserSchema,
});
