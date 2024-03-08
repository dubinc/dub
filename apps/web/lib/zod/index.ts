import * as z from "zod";
import { extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

export default z;

export const domainKeySchema = z.object({
  domain: z.string().min(1),
  key: z.string().min(1),
});

// TODO:
// Update the `workspaceId` description with where to copy the ID from

export const projectOrWorkspaceSchema = z.object({
  projectSlug: z
    .string()
    .describe(
      "[DEPRECATED (use workspaceId instead)]: The slug for the project to create tags for.",
    )
    .optional()
    .openapi({ deprecated: true }),
  workspaceId: z
    .string()
    .describe("The ID for the workspace to create tags for."),
});
