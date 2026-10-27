import {
  bulkUpdateCommissionsSchema,
  CommissionSchema,
} from "@/lib/zod/schemas/commissions";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";
import { openApiErrorResponses } from "../responses";

export const bulkUpdateCommissions: ZodOpenApiOperationObject = {
  operationId: "bulkUpdateCommissions",
  "x-speakeasy-name-override": "updateMany",
  summary: "Bulk update commissions",
  description: "Bulk update up to 100 commissions with the same status.",
  requestBody: {
    content: {
      "application/json": {
        schema: bulkUpdateCommissionsSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated commissions.",
      content: {
        "application/json": {
          schema: z.array(
            CommissionSchema.pick({
              id: true,
              status: true,
            }),
          ),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Commissions"],
  security: [{ token: [] }],
};
