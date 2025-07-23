import { openApiErrorResponses } from "@/lib/openapi/responses";
import { EnrolledPartnerSchema } from "@/lib/zod/schemas/partners";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const retrievePartner: ZodOpenApiOperationObject = {
  operationId: "retrievePartner",
  "x-speakeasy-name-override": "retrievePartner",
  summary: "Retrieve a partner.",
  description: "Retrieve a partner by their partner ID or tenant ID.",
  requestParams: {
    path: z.object({
      partnerId: z.string().min(1).describe("The partner's unique ID on Dub."),
    }),
  },
  responses: {
    "200": {
      description: "The retrieved partner.",
      content: {
        "application/json": {
          schema: EnrolledPartnerSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
