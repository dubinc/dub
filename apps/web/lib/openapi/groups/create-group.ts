import { openApiErrorResponses } from "@/lib/openapi/responses";
import { createGroupSchema, GroupSchema } from "@/lib/zod/schemas/groups";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const createGroup: ZodOpenApiOperationObject = {
  operationId: "createGroup",
  "x-speakeasy-name-override": "create",
  summary: "Create a group",
  description:
    "Create a group for the authenticated workspace's partner program.",
  requestBody: {
    content: {
      "application/json": {
        schema: createGroupSchema,
      },
    },
  },
  responses: {
    "201": {
      description: "The created group",
      content: {
        "application/json": {
          schema: GroupSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Groups"],
  security: [{ token: [] }],
};
