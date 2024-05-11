import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  clickAnalyticsQuerySchema,
  getClickAnalyticsResponse,
} from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getTopLinks: ZodOpenApiOperationObject = {
  operationId: "getTopLinks",
  "x-speakeasy-name-override": "topLinks",
  summary: "Retrieve top links",
  deprecated: true,
  description:
    "Deprecated: Use dub.anlaytics.clicks({ groupBy: 'top_links' }) instead. Retrieve the top links by number of clicks for a domain or the authenticated workspace.",
  requestParams: {
    query: workspaceParamsSchema.merge(
      clickAnalyticsQuerySchema.omit({ groupBy: true }),
    ),
  },
  responses: {
    "200": {
      description: "The top links by number of clicks",
      content: {
        "application/json": {
          schema: z.array(getClickAnalyticsResponse["top_links"]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Analytics"],
  security: [{ token: [] }],
};
