import { openApiErrorResponses } from "@/lib/openapi/responses";
import { LinkSchema, createLinkBodySchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const createLink: ZodOpenApiOperationObject = {
  operationId: "createLink",
  "x-speakeasy-name-override": "create",
  summary: "Create a new link",
  description: "Create a new link for the authenticated workspace.",
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
  security: [{ token: [] }, {}],
};
