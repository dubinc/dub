import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  WorkspaceSchema,
  createWorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const updateWorkspace: ZodOpenApiOperationObject = {
  operationId: "updateWorkspace",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a workspace",
  description: "Update a workspace by ID or slug.",
  requestParams: {
    path: z.object({
      idOrSlug: z
        .string()
        .describe("The ID or slug of the workspace to update."),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: createWorkspaceSchema.partial(),
      },
    },
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
