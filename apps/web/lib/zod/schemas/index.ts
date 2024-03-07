import { plans, roles } from "@/lib/types";
import z from "@/lib/zod";

export const planSchema = z.enum(plans).describe("The plan of the project.");

export const roleSchema = z
  .enum(roles)
  .describe("The role of the authenticated user in the project.");

// A boolean query schema that coerces the value to a boolean
export const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value == "true")
  .openapi({
    type: "boolean",
  });
