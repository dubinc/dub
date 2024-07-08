import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import { LinkSchema, updateLinkBodySchema } from "@/lib/zod/schemas/links";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { workspaceParamsSchema } from "../request";

export const updateLink: ZodOpenApiOperationObject = {
  operationId: "updateLink",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a link",
  description:
    "Update a link for the authenticated workspace. If there's no change, returns it as it is.",
  requestParams: {
    query: workspaceParamsSchema,
    path: z.object({
      linkId: z
        .string()
        .describe(
          "The id of the link to update. You may use either `linkId` (obtained via `/links/info` endpoint) or `externalId` prefixed with `ext_`.",
        ),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: updateLinkBodySchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated link",
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
