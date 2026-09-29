import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createPartnerTagSchema,
  PartnerTagSchema,
} from "@/lib/zod/schemas/partner-tags";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createPartnerTag: ZodOpenApiOperationObject = {
  operationId: "createPartnerTag",
  "x-speakeasy-name-override": "create",
  summary: "Create a partner tag",
  description: "Create a partner tag for your partner program.",
  requestBody: {
    content: {
      "application/json": {
        schema: createPartnerTagSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created partner tag.",
      content: {
        "application/json": {
          schema: PartnerTagSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partner Tags"],
  security: [{ token: [] }],
};
