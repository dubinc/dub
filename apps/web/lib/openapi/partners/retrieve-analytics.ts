import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  partnerAnalyticsQuerySchema,
  partnerAnalyticsResponseSchema,
} from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const retrievePartnerAnalytics: ZodOpenApiOperationObject = {
  operationId: "retrievePartnerAnalytics",
  "x-speakeasy-name-override": "analytics",
  summary: "Retrieve analytics for a partner",
  description:
    "Retrieve analytics for a partner within a program. The response type vary based on the `groupBy` query parameter.",
  requestParams: {
    query: partnerAnalyticsQuerySchema,
  },
  responses: {
    "200": {
      description: "Partner analytics data",
      content: {
        "application/json": {
          schema: z.union([
            partnerAnalyticsResponseSchema.count.meta({
              id: "PartnerAnalyticsCount",
            }),
            z.array(
              partnerAnalyticsResponseSchema.timeseries.meta({
                id: "PartnerAnalyticsTimeseries",
              }),
            ),
            z.array(
              partnerAnalyticsResponseSchema.top_links.meta({
                id: "PartnerAnalyticsTopLinks",
              }),
            ),
          ]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
