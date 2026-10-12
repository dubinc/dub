import { openApiErrorResponses } from "@/lib/openapi/responses";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const deletePartnerTag: ZodOpenApiOperationObject = {
  operationId: "deletePartnerTag",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a partner tag",
  description:
    "Delete a partner tag from your partner program. The tag will be removed from all partners it is assigned to.",
  requestParams: {
    path: z.object({
      partnerTagId: z
        .string()
        .describe(
          "The ID of the partner tag to delete, prefixed with `ptag_`.",
        ),
    }),
  },
  responses: {
    "200": {
      description: "The deleted partner tag ID.",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().describe("The ID of the deleted partner tag."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partner Tags"],
  security: [{ token: [] }],
};
