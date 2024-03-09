import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ProjectSchema } from "@/lib/zod/schemas/projects";

export const getProjectInfo: ZodOpenApiOperationObject = {
  operationId: "getWorkspace",
  summary: "Retrieve a workspace",
  description: "Retrieve a workspace for the authenticated user.",
  requestParams: {
    path: z.object({
      workspaceId: z.string().describe("The ID of the workspace to retrieve."),
    }),
  },
  responses: {
    "200": {
      description: "The retrieved workspace",
      content: {
        "application/json": {
          schema: ProjectSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Workspaces"],
  security: [{ bearerToken: [] }],
};
