import { openApiErrorResponses } from "@/lib/openapi/responses";
import { deactivatePartnerApiSchema } from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const deactivatePartner: ZodOpenApiOperationObject = {
  operationId: "deactivatePartner",
  "x-speakeasy-name-override": "deactivate",
  summary: "Deactivate a partner",
  description:
    "This will deactivate the partner from your program and disable all their active links. Their commissions and payouts will remain intact. You can reactivate them later if needed.",
  requestBody: {
    content: {
      "application/json": {
        schema: deactivatePartnerApiSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The deactivated partner",
      content: {
        "application/json": {
          schema: z.object({
            partnerId: z
              .string()
              .describe("The ID of the deactivated partner."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
