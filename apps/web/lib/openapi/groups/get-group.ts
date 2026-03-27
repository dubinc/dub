import { openApiErrorResponses } from "@/lib/openapi/responses";
import { GroupSchema } from "@/lib/zod/schemas/groups";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const getGroup: ZodOpenApiOperationObject = {
  operationId: "getGroup",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a group",
  description:
    "Retrieve a group by ID or slug for the authenticated workspace's partner program.",
  requestParams: {
    path: z.object({
      groupId: z
        .string()
        .describe(
          "The ID of the group to retrieve. You can also use the slug of the group.",
        ),
    }),
  },
  responses: {
    "200": {
      description: "The group",
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
