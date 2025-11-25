import { openApiErrorResponses } from "@/lib/openapi/responses";
import { banPartnerApiSchema } from "@/lib/zod/schemas/partners";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const banPartner: ZodOpenApiOperationObject = {
  operationId: "banPartner",
  "x-speakeasy-name-override": "ban",
  summary: "Ban a partner",
  description:
    "Ban a partner from your program. This will disable all links and mark all commissions as canceled.",
  requestBody: {
    content: {
      "application/json": {
        schema: banPartnerApiSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The banned partner",
      content: {
        "application/json": {
          schema: z.object({
            partnerId: z.string().describe("The ID of the banned partner."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
