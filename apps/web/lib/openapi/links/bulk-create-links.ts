import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  LinkErrorSchema,
  LinkSchema,
  createLinkBodySchema,
} from "@/lib/zod/schemas/links";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const bulkCreateLinks: ZodOpenApiOperationObject = {
  operationId: "bulkCreateLinks",
  "x-speakeasy-name-override": "createMany",
  summary: "Bulk create links",
  description: "Bulk create up to 100 links for the authenticated workspace.",
  requestBody: {
    content: {
      "application/json": {
        schema: z.array(createLinkBodySchema),
      },
    },
  },
  responses: {
    "200": {
      description: "The created links",
      content: {
        "application/json": {
          schema: z.array(z.union([LinkSchema, LinkErrorSchema])).meta({
            type: "array",
            items: {
              oneOf: [
                { $ref: "#/components/schemas/LinkSchema" },
                { $ref: "#/components/schemas/LinkErrorSchema" },
              ],
            },
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
