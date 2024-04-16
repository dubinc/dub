import z from "../zod";

export const workspaceParamsSchema = z.object({
  workspaceId: z
    .string()
    .describe("The ID of the workspace.")
    .openapi({ example: "ws_cluuwcv0r..." }),
  projectSlug: z
    .string()
    .optional()
    .describe(
      "The slug of the project. This field is deprecated – use `workspaceId` instead.",
    )
    .openapi({ deprecated: true }),
});
