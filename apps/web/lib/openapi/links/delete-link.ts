import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const deleteLink: ZodOpenApiOperationObject = {
  operationId: "deleteLink",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a link",
  description: "Delete a link for the authenticated workspace.",
  requestParams: {
    path: z.object({
      linkId: z.string().openapi({
        description:
          "The id of the link to delete. You may use either `linkId` (obtained via `/links/info` endpoint) or `externalId` prefixed with `ext_`.",
      }),
    }),
  },
  responses: {
    "200": {
      description: "The deleted link ID.",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().openapi({ description: "The ID of the link." }),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
