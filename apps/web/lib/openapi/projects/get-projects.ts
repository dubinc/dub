import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ProjectSchema } from "@/lib/zod/schemas/projects";

export const getProjects: ZodOpenApiOperationObject = {
  operationId: "getWorkspaces",
  summary: "Retrieve a list of workspaces",
  description: "Retrieve a list of workspaces for the authenticated user.",
  responses: {
    "200": {
      description: "A list of workspaces",
      content: {
        "application/json": {
          schema: z.array(ProjectSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Workspaces"],
  security: [{ bearerToken: [] }],
};
