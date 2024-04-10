import z from "../zod";

export const requestParamsSchema = z.object({
  workspaceId: z.string().describe("The ID of the workspace."),
  projectSlug: z
    .string()
    .optional()
    .describe(
      "[DEPRECATED] (use `workspaceId` instead) The slug of the project.",
    )
    .openapi({ deprecated: true }),
});
