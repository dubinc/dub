import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { clickEventResponseSchema } from "@/lib/zod/schemas/clicks";
import { leadEventResponseSchema } from "@/lib/zod/schemas/leads";
import { saleEventResponseSchema } from "@/lib/zod/schemas/sales";
import { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from "zod-openapi";

export const listEvents: ZodOpenApiOperationObject = {
  operationId: "listEvents",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of events",
  description:
    "Retrieve a paginated list of events for the authenticated workspace.",
  requestParams: {
    query: eventsQuerySchema,
  },
  responses: {
    "200": {
      description: "A list of events",
      content: {
        "application/json": {
          schema: z.union([
            z.array(clickEventResponseSchema),
            z.array(leadEventResponseSchema),
            z.array(saleEventResponseSchema),
          ]),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Events"],
  security: [{ token: [] }],
};

export const eventsPath: ZodOpenApiPathsObject = {
  "/events": {
    get: listEvents,
  },
};
