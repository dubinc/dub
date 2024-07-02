import z from "../zod";

export const workspaceParamsSchema = z.object({
  workspaceId: z
    .string()
    .optional()
    .describe("The ID of the workspace.")
    .openapi({ deprecated: true }),
  projectSlug: z
    .string()
    .optional()
    .describe(
      "The slug of the project. This field is deprecated – use `workspaceId` instead.",
    )
    .openapi({ deprecated: true }),
});
