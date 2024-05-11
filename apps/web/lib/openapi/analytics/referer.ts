import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  clickAnalyticsQuerySchema,
  getClickAnalyticsResponse,
} from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getRefererAnalytics: ZodOpenApiOperationObject = {
  operationId: "getRefererAnalytics",
  "x-speakeasy-name-override": "referers",
  summary: "Retrieve referer analytics",
  deprecated: true,
  description:
    "Deprecated: Use dub.anlaytics.clicks({ groupBy: 'referer' }) instead. Retrieve the top referers by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(
      clickAnalyticsQuerySchema.omit({ groupBy: true }),
    ),
  },
  responses: {
    "200": {
      description: "The top referers by number of clicks",
      content: {
        "application/json": {
          schema: z.array(getClickAnalyticsResponse["referer"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
