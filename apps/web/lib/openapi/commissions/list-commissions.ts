import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";
import {
  CommissionResponseSchema,
  getCommissionsQuerySchema,
} from "../../zod/schemas/commissions";
import { openApiErrorResponses } from "../responses";

export const listCommissions: ZodOpenApiOperationObject = {
  operationId: "listCommissions",
  "x-speakeasy-name-override": "list",
  summary: "Get commissions for a program.",
  description: "Retrieve a list of commissions for a program.",
  requestParams: {
    query: getCommissionsQuerySchema,
  },
  responses: {
    "200": {
      description: "The list of commissions.",
      content: {
        "application/json": {
          schema: z.array(CommissionResponseSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Commissions"],
  security: [{ token: [] }],
};
