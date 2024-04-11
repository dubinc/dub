import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { getAnalyticsQuerySchema } from "@/lib/zod/schemas";
import { COUNTRY_CODES } from "@dub/utils";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getCityAnalytics: ZodOpenApiOperationObject = {
  operationId: "getCityAnalytics",
  "x-speakeasy-name-override": "cities",
  summary: "Retrieve city analytics",
  description:
    "Retrieve the top countries by number of clicks for a link, a domain, or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(getAnalyticsQuerySchema),
  },
  responses: {
    "200": {
      description: "The top cities by number of clicks",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              city: z.string().describe("The name of the city"),
              country: z
                .enum(COUNTRY_CODES)
                .describe(
                  "The 2-letter country code of the city: https://d.to/geo",
                ),
              clicks: z
                .number()
                .describe("The number of clicks from this city"),
            }),
          ),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
