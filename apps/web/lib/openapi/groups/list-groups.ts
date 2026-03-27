import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  getGroupsQuerySchema,
  GroupSchemaExtended,
} from "@/lib/zod/schemas/groups";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const listGroups: ZodOpenApiOperationObject = {
  operationId: "listGroups",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of groups",
  description:
    "Retrieve a list of groups for the authenticated workspace's partner program.",
  requestParams: {
    query: getGroupsQuerySchema,
  },
  responses: {
    "200": {
      description: "A list of groups",
      content: {
        "application/json": {
          schema: z.array(GroupSchemaExtended),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Groups"],
  security: [{ token: [] }],
};
