import { updateCommissionSchema } from "@/lib/zod/schemas/commissions";
import { ZodOpenApiOperationObject } from "zod-openapi";
import { CommissionSchema } from "../../zod/schemas/commissions";
import { openApiErrorResponses } from "../responses";

export const updateCommission: ZodOpenApiOperationObject = {
  operationId: "updateCommission",
  "x-speakeasy-name-override": "update",
  summary: "Update a commission.",
  description:
    "Update an existing commission amount. This is useful for handling refunds (partial or full) or fraudulent sales.",
  requestParams: {
    path: CommissionSchema.pick({ id: true }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: updateCommissionSchema,
      },
    },
  },
  responses: {
    "200": {
      description: "The updated commission.",
      content: {
        "application/json": {
          schema: CommissionSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Commissions"],
  security: [{ token: [] }],
};
