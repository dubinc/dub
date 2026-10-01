import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  getPartnerApplicationsQuerySchema,
  ProgramApplicationSchema,
} from "@/lib/zod/schemas/program-application";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const listProgramApplications: ZodOpenApiOperationObject = {
  operationId: "listPartnerApplications",
  "x-speakeasy-name-override": "list",
  summary: "List all program applications",
  description:
    "Retrieve a paginated list of applications for your partner program. Filter by `status` to list pending, approved, or rejected applications.",
  requestParams: {
    query: getPartnerApplicationsQuerySchema,
  },
  responses: {
    "200": {
      description: "The list of program applications.",
      content: {
        "application/json": {
          schema: z.array(ProgramApplicationSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Partner Applications"],
  security: [{ token: [] }],
};
