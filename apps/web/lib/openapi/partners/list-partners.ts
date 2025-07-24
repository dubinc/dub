import { openApiErrorResponses } from "@/lib/openapi/responses";
import z from "@/lib/zod";
import {
  EnrolledPartnerSchema,
  getPartnersQuerySchema,
} from "@/lib/zod/schemas/partners";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const listPartners: ZodOpenApiOperationObject = {
  operationId: "listPartners",
  "x-speakeasy-name-override": "list",
  summary: "List all partners",
  description: "List all partners for a partner program.",
  requestParams: {
    query: getPartnersQuerySchema,
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
