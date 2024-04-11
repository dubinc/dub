import z from "../zod";

export const workspaceParamsSchema = z.object({
  workspaceId: z.string().describe("The ID of the workspace."),
  projectSlug: z
    .string()
    .optional()
    .describe("The slug of the project. Use `workspaceId` instead.")
    .openapi({ deprecated: true }),
});
