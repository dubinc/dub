import { openApiErrorResponses } from "@/lib/openapi/responses";
import { leadEventSchema } from "@/lib/webhook/schemas";
import { trackLeadRequestSchema } from "@/lib/zod/schemas/leads";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const trackLead: ZodOpenApiOperationObject = {
  operationId: "trackLead",
  "x-speakeasy-name-override": "lead",
  summary: "Track a lead",
  description: "Track a lead for a short link.",
  requestBody: {
    content: {
      "application/json": {
        schema: trackLeadRequestSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "A lead was tracked.",
      content: {
        "application/json": {
          schema: leadEventSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Track"],
  security: [{ token: [] }],
};
