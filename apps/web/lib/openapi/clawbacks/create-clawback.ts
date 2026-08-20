import {
  createClawbackSchema,
  createCommissionResponseSchema,
} from "@/lib/zod/schemas/commissions";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses } from "../responses";

export const createClawback: ZodOpenApiOperationObject = {
  operationId: "createClawback",
  "x-speakeasy-name-override": "create",
  summary: "Create clawback",
  description:
    "Create a clawback for a partner. Clawback creation is processed asynchronously. Use the List Commissions endpoint or webhooks to be notified when the clawback is created.",
  requestBody: {
    content: {
      "application/json": {
        schema: createClawbackSchema,
      },
    },
  },
  responses: {
    "202": {
      description: "The request was accepted and clawback creation was queued.",
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
