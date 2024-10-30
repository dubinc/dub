import { z } from "zod";

export const PartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  bio: z.string().nullable(),
  country: z.string().nullable(),
  status: z.enum(["default", "pending", "approved"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProgramSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  type: z.enum(["affiliate", "referral"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});
