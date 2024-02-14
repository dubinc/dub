import z from "@/lib/zod";

export enum Plan {
  "free",
  "pro",
  "business",
  "enterprise",
}

export enum Role {
  "owner",
  "member",
}

export const PlanSchema = z
  .nativeEnum(Plan)
  .default(Plan.free)
  .describe("The plan of the project.");

export const RoleSchema = z
  .nativeEnum(Role)
  .describe("The role of the authenticated user in the project.");
