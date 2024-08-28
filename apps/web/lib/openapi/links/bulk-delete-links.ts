import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const bulkDeleteLinks: ZodOpenApiOperationObject = {
  operationId: "bulkDeleteLinks",
  "x-speakeasy-name-override": "deleteMany",
  summary: "Bulk delete links",
  description: "Bulk delete up to 100 links for the authenticated workspace.",
  responses: {
    "200": {
      description: "The deleted links count.",
      content: {
        "application/json": {
          schema: z.object({
            deletedCount: z.number(),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
