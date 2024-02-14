import { Plan, Role, TagColor } from "@/lib/types";
import z from "@/lib/zod";

export const planSchema = z
  .nativeEnum(Plan)
  .default(Plan.free)
  .describe("The plan of the project.");

export const roleSchema = z
  .nativeEnum(Role)
  .describe("The role of the authenticated user in the project.");

export const tagColorSchema = z
  .nativeEnum(TagColor)
  .describe("The color of the tag.");
