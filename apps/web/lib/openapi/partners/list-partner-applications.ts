import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  getPartnerApplicationsQuerySchema,
  partnerApplicationSchema,
} from "@/lib/zod/schemas/program-application";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const listPartnerApplications: ZodOpenApiOperationObject = {
  operationId: "listPartnerApplications",
  "x-speakeasy-name-override": "list",
  summary: "List pending partner applications",
  description:
    "Retrieve pending partner program applications for the authenticated workspace's default program.",
  requestParams: {
    query: getPartnerApplicationsQuerySchema,
  },
  responses: {
    "200": {
      description: "The list of pending partner applications.",
      content: {
        "application/json": {
          schema: z.array(partnerApplicationSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
