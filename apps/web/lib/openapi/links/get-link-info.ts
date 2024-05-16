import { openApiErrorResponses } from "@/lib/openapi/responses";
import { getLinkInfoQuerySchema, LinkSchema } from "@/lib/zod/schemas/links";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getLinkInfo: ZodOpenApiOperationObject = {
  operationId: "getLinkInfo",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a link",
  description: "Retrieve the info for a link.",
  requestParams: {
    query: workspaceParamsSchema.merge(getLinkInfoQuerySchema),
  },
  responses: {
    "200": {
      description: "The retrieved link",
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
