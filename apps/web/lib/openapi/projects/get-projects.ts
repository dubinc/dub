import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { ProjectSchema } from "@/lib/zod/schemas/projects";
import { openApiErrorResponses } from "@/lib/openapi/responses";

export const getProjects: ZodOpenApiOperationObject = {
  operationId: "getProjects",
  summary: "Retrieve a list of projects",
  description: "Retrieve a list of projects for the authenticated user.",
  responses: {
    "200": {
      description: "A list of projects",
      content: {
        "application/json": {
          schema: z.array(ProjectSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Projects"],
  security: [{ bearerToken: [] }],
};
