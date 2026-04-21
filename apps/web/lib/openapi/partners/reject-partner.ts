import { openApiErrorResponses } from "@/lib/openapi/responses";
import { rejectPartnerSchema } from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const rejectPartner: ZodOpenApiOperationObject = {
  operationId: "rejectPartner",
  "x-speakeasy-name-override": "reject",
  summary: "Reject a partner",
  description:
    "Reject a pending partner application to your program. The partner will be notified via email that their application was not approved.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: rejectPartnerSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The rejected partner",
      content: {
        "application/json": {
          schema: z.object({
            partnerId: z.string().describe("The ID of the rejected partner."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
