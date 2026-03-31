import { openApiErrorResponses } from "@/lib/openapi/responses";
import { getTagsQuerySchema, LinkTagSchema } from "@/lib/zod/schemas/tags";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const getTags: ZodOpenApiOperationObject = {
  operationId: "getTags",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of tags",
  description: "Retrieve a list of tags for the authenticated workspace.",
  requestParams: {
    query: getTagsQuerySchema,
  },
  responses: {
    "200": {
      description: "A list of tags",
      content: {
        "application/json": {
          schema: z.array(LinkTagSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Tags"],
  security: [{ token: [] }],
};
