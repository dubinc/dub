import { openApiErrorResponses } from "@/lib/openapi/responses";
import { LinkSchema, createLinkBodySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const upsertLink: ZodOpenApiOperationObject = {
  operationId: "upsertLink",
  "x-speakeasy-name-override": "upsert",
  "x-speakeasy-usage-example": true,
  summary: "Upsert a link",
  description:
    "Upsert a link for the authenticated workspace by its URL. If a link with the same URL already exists, returns as is if there's no change, or update it. Otherwise, a new link will be created.",
  requestParams: {
    query: workspaceParamsSchema,
  },
  requestBody: {
    content: {
      "application/json": {
        schema: createLinkBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The upserted link",
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
