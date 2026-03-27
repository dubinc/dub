import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  createReferralsEmbedTokenSchema,
  ReferralsEmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createReferralsEmbedToken: ZodOpenApiOperationObject = {
  operationId: "createReferralsEmbedToken",
  "x-speakeasy-name-override": "referrals",
  summary: "Create a referrals embed token",
  description:
    "Create a referrals embed token for the given partner/tenant. The endpoint first attempts to locate an existing enrollment using the provided tenantId. If no enrollment is found, it resolves the partner by email and creates a new enrollment as needed. This results in an upsert-style flow that guarantees a valid enrollment and returns a usable embed token.",
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
