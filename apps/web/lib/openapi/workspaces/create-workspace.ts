import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  WorkspaceSchema,
  createWorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";

export const createWorkspace = {
  operationId: "createWorkspace",
  "x-speakeasy-name-override": "create",
  summary: "Create a workspace",
  description: "Create a new workspace for the authenticated user.",
  requestBody: {
    content: {
      "application/json": {
        schema: createWorkspaceSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The created workspace",
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
