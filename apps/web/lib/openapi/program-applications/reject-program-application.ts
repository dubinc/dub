import { openApiErrorResponses } from "@/lib/openapi/responses";
import { rejectProgramApplicationSchema } from "@/lib/zod/schemas/program-application";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const rejectProgramApplication: ZodOpenApiOperationObject = {
  operationId: "rejectProgramApplication",
  "x-speakeasy-name-override": "reject",
  summary: "Reject a partner application",
  description:
    "Reject a pending partner application to your program. The partner will be notified via email that their application was not approved.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: rejectProgramApplicationSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The rejected partner",
      content: {
        "application/json": {
          schema: z.object({
            partnerId: z.string().describe("The ID of the rejected partner."),
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Program Applications"],
  security: [{ token: [] }],
};
