import { openApiErrorResponses } from "@/lib/openapi/responses";
import { BountySubmissionSchema } from "@/lib/zod/schemas/bounties";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const getBountySubmission: ZodOpenApiOperationObject = {
  operationId: "getBountySubmission",
  "x-speakeasy-name-override": "getSubmission",
  summary: "Get a bounty submission",
  description: "Retrieve a specific bounty submission by ID.",
  requestParams: {
    path: z.object({
      bountyId: z.string(),
      submissionId: z.string(),
    }),
  },
  responses: {
    "200": {
      description: "The bounty submission.",
      content: {
        "application/json": {
          schema: BountySubmissionSchema,
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Bounties"],
  security: [{ token: [] }],
};
