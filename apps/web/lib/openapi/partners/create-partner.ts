import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createPartner: ZodOpenApiOperationObject = {
  operationId: "createPartner",
  "x-speakeasy-name-override": "create",
  summary: "Create or update a partner",
  description:
    "Creates or updates a partner record (upsert behavior). If a partner with the same email already exists, their program enrollment will be updated with the provided tenantId. If no existing partner is found, a new partner will be created using the supplied information.",
  requestBody: {
    content: {
      "application/json": {
        schema: createPartnerSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created or updated partner",
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
