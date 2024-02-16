import { plans, roles, tagColors } from "@/lib/types";
import z from "@/lib/zod";

export const planSchema = z.enum(plans).describe("The plan of the project.");

export const roleSchema = z
  .enum(roles)
  .describe("The role of the authenticated user in the project.");

export const tagColorSchema = z
  .enum(tagColors)
  .describe("The color of the tag.");
