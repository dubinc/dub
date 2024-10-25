import { z } from "zod";

export const dashboardSchema = z.object({
  id: z.string(),
  linkId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  doIndex: z.boolean().optional(),
  password: z.string().optional(),
  showConversions: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
