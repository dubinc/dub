import { z } from "zod";
import { domainKeySchema } from "./links";

export const dashboardSchema = z.object({
  id: z.string(),
  linkId: z.string().nullable(),
  folderId: z.string().nullable(),
  projectId: z.string().nullable(),
  userId: z.string().nullable(),
  password: z.string().nullable(),
  doIndex: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createDashboardQuerySchema = domainKeySchema.or(
  z.object({
    folderId: z.string(),
  }),
);

export const updateDashboardBodySchema = dashboardSchema.pick({
  doIndex: true,
  password: true,
});
