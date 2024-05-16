import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { WorkspaceSchema } from "@/lib/zod/schemas/workspaces";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getWorkspaces: ZodOpenApiOperationObject = {
  operationId: "getWorkspaces",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of workspaces",
  description: "Retrieve a list of workspaces for the authenticated user.",
  responses: {
    "200": {
      description: "A list of workspaces",
      content: {
        "application/json": {
          schema: z.array(WorkspaceSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Workspaces"],
  security: [{ token: [] }],
};
