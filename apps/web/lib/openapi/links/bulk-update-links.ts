import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { LinkSchema, bulkUpdateLinksBodySchema } from "@/lib/zod/schemas/links";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const bulkUpdateLinks: ZodOpenApiOperationObject = {
  operationId: "bulkUpdateLinks",
  "x-speakeasy-name-override": "updateMany",
  summary: "Bulk update links",
  description:
    "Bulk update up to 100 links with the same data for the authenticated workspace.",
  requestBody: {
    content: {
      "application/json": {
        schema: bulkUpdateLinksBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated links",
      content: {
        "application/json": {
          schema: z.array(LinkSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
