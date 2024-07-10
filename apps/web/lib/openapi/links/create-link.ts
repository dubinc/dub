import { openApiErrorResponses } from "@/lib/openapi/responses";
import { LinkSchema, createLinkBodySchema } from "@/lib/zod/schemas/links";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createLink: ZodOpenApiOperationObject = {
  operationId: "createLink",
  "x-speakeasy-name-override": "create",
  "x-speakeasy-usage-example": true,
  summary: "Create a new link",
  description: "Create a new link for the authenticated workspace.",
  requestBody: {
    content: {
      "application/json": {
        schema: createLinkBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The created link",
      content: {
        "application/json": {
          schema: LinkSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Links"],
  security: [{ token: [] }],
};
