import { openApiErrorResponses } from "@/lib/openapi/responses";
import { approvePartnerSchema } from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const approvePartner: ZodOpenApiOperationObject = {
  operationId: "approvePartner",
  "x-speakeasy-name-override": "approve",
  summary: "Approve a partner",
  description:
    "Approve a pending partner application to your program. The partner will be enrolled in the specified group and notified of the approval.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: approvePartnerSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The approved partner",
      content: {
        "application/json": {
          schema: z.object({
            partnerId: z.string().describe("The ID of the approved partner."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partner Applications"],
  security: [{ token: [] }],
};
