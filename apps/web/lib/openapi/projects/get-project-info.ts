import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { projectSchema } from "@/lib/zod/schemas/projects";
import { openApiErrorResponses } from "@/lib/openapi/responses";

export const getProjectInfo: ZodOpenApiOperationObject = {
  operationId: "getProject",
  summary: "Retrieve a project",
  description: "Retrieve a project for the authenticated user.",
  requestParams: {
    path: z.object({
      projectSlug: z
        .string()
        .describe(
          "The slug for the project to retrieve. E.g. for `app.dub.co/acme`, the projectSlug is `acme`.",
        ),
    }),
  },
  responses: {
    "200": {
      description: "The retrieved project",
      content: {
        "application/json": {
          schema: projectSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Projects"],
  security: [{ bearerToken: [] }],
};
