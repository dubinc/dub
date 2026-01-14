import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  approveBountySubmissionBodySchema,
  BountySubmissionSchema,
} from "@/lib/zod/schemas/bounties";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const approveBountySubmission: ZodOpenApiOperationObject = {
  operationId: "approveBountySubmission",
  "x-speakeasy-name-override": "approveSubmission",
  summary: "Approve a bounty submission",
  description:
    "Approve a bounty submission. Optionally specify a custom reward amount.",
  requestParams: {
    path: z.object({
      bountyId: z.string(),
      submissionId: z.string(),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: approveBountySubmissionBodySchema.optional(),
      },
    },
  },
  responses: {
    "200": {
      description: "The approved bounty submission.",
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
