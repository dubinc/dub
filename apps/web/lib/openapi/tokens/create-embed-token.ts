import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createEmbedTokenSchema,
  EmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createEmbedToken: ZodOpenApiOperationObject = {
  operationId: "createEmbedToken",
  "x-speakeasy-name-override": "create",
  summary: "Create a new embed token",
  description: "Create a new embed token for the referral link.",
  requestBody: {
    content: {
      "application/json": {
        schema: createEmbedTokenSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created public embed token.",
      content: {
        "application/json": {
          schema: EmbedTokenSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Embed Tokens"],
  security: [{ token: [] }],
};
