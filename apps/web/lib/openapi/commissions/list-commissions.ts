import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";
import {
  CommissionEnrichedSchema,
  getCommissionsQuerySchema,
} from "../../zod/schemas/commissions";
import { openApiErrorResponses } from "../responses";

export const listCommissions: ZodOpenApiOperationObject = {
  operationId: "listCommissions",
  "x-speakeasy-name-override": "list",
  "x-speakeasy-pagination": {
    type: "cursor",
    inputs: [
      {
        name: "startingAfter",
        in: "parameters",
        type: "cursor",
      },
    ],
    outputs: {
      nextCursor: "$[-1].id",
    },
  },
  summary: "List all commissions",
  description:
    "Retrieve a paginated list of commissions for your partner program.",
  requestParams: {
    query: getCommissionsQuerySchema,
  },
  responses: {
    "200": {
      description: "The list of commissions.",
      content: {
        "application/json": {
          schema: z.array(CommissionEnrichedSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Commissions"],
  security: [{ token: [] }],
};
