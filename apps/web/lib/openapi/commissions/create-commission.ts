import {
  createCommissionResponseSchema,
  createManualCommissionBodySchema,
} from "@/lib/zod/schemas/commissions";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses } from "../responses";

export const createCommission: ZodOpenApiOperationObject = {
  operationId: "createCommission",
  "x-speakeasy-name-override": "create",
  summary: "Create commission",
  description:
    "Create one or more commissions (custom, lead or sale) for a partner. Custom commissions accept a negative `amount` to create a clawback. Commission creation is processed asynchronously – use the GET /commissions endpoint or webhooks to be notified when the commission is created.",
  requestBody: {
    content: {
      "application/json": {
        schema: createManualCommissionBodySchema,
      },
    },
  },
  responses: {
    "202": {
      description:
        "The request was accepted and commission creation was queued.",
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
