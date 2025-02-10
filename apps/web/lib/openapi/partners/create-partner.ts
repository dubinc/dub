import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createPartner: ZodOpenApiOperationObject = {
  operationId: "createPartner",
  "x-speakeasy-name-override": "create",
  summary: "Create a new partner",
  description:
    "Create a new partner for a program. If partner exists, automatically enrolls them.",
  requestBody: {
    content: {
      "application/json": {
        schema: createPartnerSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created partner",
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
