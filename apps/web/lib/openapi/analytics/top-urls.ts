import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  analyticsResponseSchema,
  getAnalyticsQuerySchema,
} from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getTopURLs: ZodOpenApiOperationObject = {
  operationId: "getTopURLs",
  "x-speakeasy-name-override": "topUrls",
  summary: "Retrieve top URLs",
  description:
    "Retrieve the top URLs by number of clicks for a given short link.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top URLs by number of clicks",
      content: {
        "application/json": {
          schema: z.array(analyticsResponseSchema["topUrls"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
