import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  trackSaleRequestSchema,
  trackSaleResponseSchema,
} from "@/lib/zod/schemas/sales";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const trackSale: ZodOpenApiOperationObject = {
  operationId: "trackSale",
  "x-speakeasy-name-override": "sale",
  summary: "Track a sale",
  description: "Track a sale for a short link.",
  requestParams: {
    query: workspaceParamsSchema,
  },
  requestBody: {
    content: {
      "application/json": {
        schema: trackSaleRequestSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "A sale was tracked.",
      content: {
        "application/json": {
          schema: trackSaleResponseSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Track"],
  security: [{ token: [] }],
};
