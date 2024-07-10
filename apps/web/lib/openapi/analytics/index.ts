import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { analyticsQuerySchema } from "@/lib/zod/schemas/analytics";
import { clickAnalyticsResponse } from "@/lib/zod/schemas/clicks-analytics";
import { leadAnalyticsResponse } from "@/lib/zod/schemas/leads-analytics";
import { saleAnalyticsResponse } from "@/lib/zod/schemas/sales-analytics";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

const retrieveAnalytics: ZodOpenApiOperationObject = {
  operationId: "retrieveAnalytics",
  "x-speakeasy-name-override": "retrieve",
  summary:
    "Retrieve analytics for a link, a domain, or the authenticated workspace.",
  description:
    "Retrieve analytics for a link, a domain, or the authenticated workspace. The response type depends on the `event` and `type` query parameters.",
  requestParams: {
    query: analyticsQuerySchema,
  },
  responses: {
    "200": {
      description: "Analytics data",
      content: {
        "application/json": {
          schema: z.union([
            clickAnalyticsResponse.count,
            z
              .array(clickAnalyticsResponse.timeseries)
              .openapi({ title: "ClickTimeseries" }),
            z
              .array(clickAnalyticsResponse.countries)
              .openapi({ title: "ClickCountries" }),
            z
              .array(clickAnalyticsResponse.cities)
              .openapi({ title: "ClickCities" }),
            z
              .array(clickAnalyticsResponse.devices)
              .openapi({ title: "ClickDevices" }),
            z
              .array(clickAnalyticsResponse.browsers)
              .openapi({ title: "ClickBrowsers" }),
            z.array(clickAnalyticsResponse.os).openapi({ title: "ClickOS" }),
            z
              .array(clickAnalyticsResponse.referers)
              .openapi({ title: "ClickReferers" }),
            z
              .array(clickAnalyticsResponse.top_links)
              .openapi({ title: "ClickTopLinks" }),
            z
              .array(clickAnalyticsResponse.top_urls)
              .openapi({ title: "ClickTopUrls" }),

            leadAnalyticsResponse.count,
            z
              .array(leadAnalyticsResponse.timeseries)
              .openapi({ title: "LeadsTimeseries" }),
            z
              .array(leadAnalyticsResponse.countries)
              .openapi({ title: "LeadsCountries" }),
            z
              .array(leadAnalyticsResponse.cities)
              .openapi({ title: "LeadsCities" }),
            z
              .array(leadAnalyticsResponse.devices)
              .openapi({ title: "LeadsDevices" }),
            z
              .array(leadAnalyticsResponse.browsers)
              .openapi({ title: "LeadsBrowsers" }),
            z.array(leadAnalyticsResponse.os).openapi({ title: "LeadsOS" }),
            z
              .array(leadAnalyticsResponse.referers)
              .openapi({ title: "LeadsReferers" }),
            z
              .array(leadAnalyticsResponse.top_links)
              .openapi({ title: "LeadsTopLinks" }),
            z
              .array(leadAnalyticsResponse.top_urls)
              .openapi({ title: "LeadsTopUrls" }),

            saleAnalyticsResponse.count,
            z
              .array(saleAnalyticsResponse.timeseries)
              .openapi({ title: "SalesTimeseries" }),
            z
              .array(saleAnalyticsResponse.countries)
              .openapi({ title: "SalesCountries" }),
            z
              .array(saleAnalyticsResponse.cities)
              .openapi({ title: "SalesCities" }),
            z
              .array(saleAnalyticsResponse.devices)
              .openapi({ title: "SalesDevices" }),
            z
              .array(saleAnalyticsResponse.browsers)
              .openapi({ title: "SalesBrowsers" }),
            z.array(saleAnalyticsResponse.os).openapi({ title: "SalesOS" }),
            z
              .array(saleAnalyticsResponse.referers)
              .openapi({ title: "SalesReferers" }),
            z
              .array(saleAnalyticsResponse.top_links)
              .openapi({ title: "SalesTopLinks" }),
            z
              .array(saleAnalyticsResponse.top_urls)
              .openapi({ title: "SalesTopUrls" }),
          ]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};

export const analyticsPath: ZodOpenApiPathsObject = {
  "/analytics": {
    get: retrieveAnalytics,
  },
};
