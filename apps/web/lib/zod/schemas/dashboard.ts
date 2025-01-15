import { z } from "zod";

export const dashboardSchema = z.object({
  id: z.string(),
  linkId: z.string().nullable(),
  projectId: z.string().nullable(),
  userId: z.string().nullable(),
  password: z.string().nullable(),
  doIndex: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const updateDashboardBodySchema = dashboardSchema.pick({
  doIndex: true,
  password: true,
});
