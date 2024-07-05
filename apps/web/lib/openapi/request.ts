import z from "../zod";

export const workspaceParamsSchema = z.object({
  workspaceId: z
    .string()
    .optional()
    .describe("The ID of the workspace.")
    .openapi({ deprecated: true }),
});
