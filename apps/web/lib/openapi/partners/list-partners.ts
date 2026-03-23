import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  EnrolledPartnerSchema,
  getPartnersQuerySchemaExtended,
} from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const listPartners: ZodOpenApiOperationObject = {
  operationId: "listPartners",
  "x-speakeasy-name-override": "list",
  summary: "List all partners",
  description: "List all partners for a partner program.",
  requestParams: {
    query: getPartnersQuerySchemaExtended,
  },
  responses: {
    "200": {
      description: "The list of partners.",
      content: {
        "application/json": {
          schema: z.array(EnrolledPartnerSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
