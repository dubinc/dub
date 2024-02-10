import { ZodOpenApiOperationObject } from "zod-openapi";

import z from "@/lib/zod";
import { TagSchema } from "@/lib/zod/schemas/tags";
import { openApiErrorResponses } from "@/lib/openapi/responses";

export const getTags: ZodOpenApiOperationObject = {
  operationId: "getTags",
  summary: "Retrieve a list of tags",
  description: "Retrieve a list of tags for the authenticated project.",
  requestParams: {
    path: z.object({
      projectSlug: z
        .string()
        .describe(
          "The slug for the project to retrieve tags for. E.g. for `app.dub.co/acme`, the `projectSlug` is `acme`.",
        ),
    }),
  },
  responses: {
    "200": {
      description: "A list of tags",
      content: {
        "application/json": {
          schema: z.array(TagSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ bearerToken: [] }],
};
