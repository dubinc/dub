import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  trackOpenRequestSchema,
  trackOpenResponseSchema,
} from "@/lib/zod/schemas/opens";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const trackOpen: ZodOpenApiOperationObject = {
  operationId: "trackOpen",
  "x-speakeasy-ignore": true,
  summary: "Track a deep link open event",
  description:
    "This endpoint is used to track when a user opens your app via a Dub-powered deep link (for both iOS and Android).",
  requestBody: {
    content: {
      "application/json": {
        schema: trackOpenRequestSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The response from the tracked open event.",
      content: {
        "application/json": {
          schema: trackOpenResponseSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Track"],
};
