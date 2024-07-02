import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getLinksCountQuerySchema } from "@/lib/zod/schemas/links";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getLinksCount: ZodOpenApiOperationObject = {
  operationId: "getLinksCount",
  "x-speakeasy-name-override": "count",
  summary: "Retrieve links count",
  description: "Retrieve the number of links for the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(getLinksCountQuerySchema),
  },
  responses: {
    "200": {
      description: "A list of links",
      content: {
        "application/json": {
          schema: z.number().openapi({
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
