import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  PayoutResponseSchema,
  payoutsQuerySchema,
} from "@/lib/zod/schemas/payouts";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const listPayouts: ZodOpenApiOperationObject = {
  operationId: "listPayouts",
  "x-speakeasy-name-override": "list",
  summary: "List all payouts",
  description: "Retrieve a list of payouts for your partner program.",
  requestParams: {
    query: payoutsQuerySchema,
  },
  responses: {
    "200": {
      description: "The list of payouts.",
      content: {
        "application/json": {
          schema: z.array(PayoutResponseSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Payouts"],
  security: [{ token: [] }],
};
