import { openApiErrorResponses } from "@/lib/openapi/responses";
import { retrievePartnerLinksSchema } from "@/lib/zod/schemas/partners";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

export const retrievePartnerLinks: ZodOpenApiOperationObject = {
  operationId: "retrieveLinks",
  "x-speakeasy-name-override": "retrieveLinks",
  summary: "Retrieve a partner's links.",
  description: "Retrieve a partner's links by their partner ID or tenant ID.",
  requestParams: {
    query: retrievePartnerLinksSchema,
  },
  responses: {
    "200": {
      description: "The retrieved partner links.",
      content: {
        "application/json": {
          schema: z.array(ProgramPartnerLinkSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partners"],
  security: [{ token: [] }],
};
