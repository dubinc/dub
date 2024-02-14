import { ZodOpenApiOperationObject } from "zod-openapi";

import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { tagSchema } from "@/lib/zod/schemas/tags";

export const getTags: ZodOpenApiOperationObject = {
  operationId: "getTags",
  summary: "Retrieve a list of tags",
  description: "Retrieve a list of tags for the authenticated project.",
  requestParams: {
    query: z.object({
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
          schema: z.array(tagSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ bearerToken: [] }],
};
