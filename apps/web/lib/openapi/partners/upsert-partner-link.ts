import { openApiErrorResponses } from "@/lib/openapi/responses";
import { LinkSchema } from "@/lib/zod/schemas/links";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const upsertPartnerLink: ZodOpenApiOperationObject = {
  operationId: "upsertPartnerLink",
  "x-speakeasy-name-override": "upsertLink",
  summary: "Upsert a link for a partner",
  description:
    "Upsert a link for a partner that is enrolled in your program. If a link with the same URL already exists, return it (or update it if there are any changes). Otherwise, a new link will be created.",
  requestBody: {
    content: {
      "application/json": {
        schema: createPartnerLinkSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The upserted partner link",
      content: {
        "application/json": {
          schema: LinkSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
