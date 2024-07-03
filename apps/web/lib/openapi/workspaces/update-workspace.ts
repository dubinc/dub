import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { WorkspaceSchema } from "@/lib/zod/schemas/workspaces";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const updateWorkspace: ZodOpenApiOperationObject = {
  operationId: "updateWorkspace",
  "x-speakeasy-name-override": "update",
  summary: "Update a workspace",
  description: "Update a workspace by ID or slug.",
  requestParams: {
    path: z.object({
      idOrSlug: z.string().describe("The ID or slug of the workspace."),
    }),
  },
  responses: {
    "200": {
      description: "The updated workspace.",
      content: {
        "application/json": {
          schema: WorkspaceSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Workspaces"],
  security: [{ token: [] }],
};
