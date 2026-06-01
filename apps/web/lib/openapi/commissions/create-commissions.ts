import {
  createCommissionBodySchema,
  createCommissionResponseSchema,
} from "@/lib/zod/schemas/commissions";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses } from "../responses";

export const createCommissions: ZodOpenApiOperationObject = {
  operationId: "createCommissions",
  "x-speakeasy-name-override": "create",
  summary: "Create commissions",
  description: "Create one or more commissions for a partner.",
  requestBody: {
    content: {
      "application/json": {
        schema: createCommissionBodySchema,
      },
    },
  },
  responses: {
    "202": {
      description: "The created commissions.",
      content: {
        "application/json": {
          schema: createCommissionResponseSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Commissions"],
  security: [{ token: [] }],
};
