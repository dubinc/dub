import { openApiErrorResponses } from "@/lib/openapi/responses";
import { LinkSchema } from "@/lib/zod/schemas/links";
import { createPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createPartnerLink: ZodOpenApiOperationObject = {
  operationId: "createPartnerLink",
  "x-speakeasy-name-override": "createLink",
  summary: "Create a link for a partner",
  description:
    "Create a new link for a partner that is enrolled in your program.",
  requestBody: {
    content: {
      "application/json": {
        schema: createPartnerLinkSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created partner link",
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
