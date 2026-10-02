import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createPartnerTagSchema,
  PartnerTagSchema,
} from "@/lib/zod/schemas/partner-tags";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const updatePartnerTag: ZodOpenApiOperationObject = {
  operationId: "updatePartnerTag",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a partner tag",
  description: "Update a partner tag in your partner program.",
  requestParams: {
    path: z.object({
      partnerTagId: z
        .string()
        .describe(
          "The ID of the partner tag to update, prefixed with `ptag_`.",
        ),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: createPartnerTagSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated partner tag.",
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
