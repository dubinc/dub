import { openApiErrorResponses } from "@/lib/openapi/responses";
import { domainKeySchema, LinkSchema } from "@/lib/zod/schemas";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const getLinkInfo: ZodOpenApiOperationObject = {
  operationId: "getLinkInfo",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a link",
  description: "Retrieve the info for a link from their domain and key.",
  requestParams: {
    query: workspaceParamsSchema.merge(domainKeySchema),
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
