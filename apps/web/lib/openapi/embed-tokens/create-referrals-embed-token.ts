import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createReferralsEmbedTokenSchema,
  ReferralsEmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createReferralsEmbedToken: ZodOpenApiOperationObject = {
  operationId: "createReferralsEmbedToken",
  "x-speakeasy-name-override": "referrals",
  summary: "Create a new referrals embed token",
  description:
    "Create a new referrals embed token for the given partner/tenant.",
  requestBody: {
    content: {
      "application/json": {
        schema: createReferralsEmbedTokenSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created public embed token.",
      content: {
        "application/json": {
          schema: ReferralsEmbedTokenSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Embed Tokens"],
  security: [{ token: [] }],
};
