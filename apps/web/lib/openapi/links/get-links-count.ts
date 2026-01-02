import { openApiErrorResponses } from "@/lib/openapi/responses";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const getLinksCount: ZodOpenApiOperationObject = {
  operationId: "getLinksCount",
  "x-speakeasy-name-override": "count",
  summary: "Retrieve links count",
  description: "Retrieve the number of links for the authenticated workspace.",
  requestParams: {
    query: getLinksCountQuerySchema,
  },
  responses: {
    "200": {
      description: "A list of links",
      content: {
        "application/json": {
          schema: z.number().meta({
            description: "The number of links matching the query.",
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
