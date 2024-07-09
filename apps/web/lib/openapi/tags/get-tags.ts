import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { TagSchema } from "@/lib/zod/schemas/tags";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getTags: ZodOpenApiOperationObject = {
  operationId: "getTags",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of tags",
  description: "Retrieve a list of tags for the authenticated workspace.",
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
  security: [{ token: [] }],
};
