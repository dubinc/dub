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
    "Creates a partner and enrolls them in the program. If that email is already enrolled, the enrollment is returned unchanged, except a different `tenantId` replaces the current one when it is not already associated with another partner in the program.",
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
