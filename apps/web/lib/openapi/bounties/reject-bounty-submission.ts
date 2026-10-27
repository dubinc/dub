import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  BountySubmissionSchema,
  rejectBountySubmissionBodySchema,
} from "@/lib/zod/schemas/bounties";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const rejectBountySubmission: ZodOpenApiOperationObject = {
  operationId: "rejectBountySubmission",
  "x-speakeasy-name-override": "rejectSubmission",
  summary: "Reject a bounty submission",
  description:
    "Reject a bounty submission with a specified reason and optional note.",
  requestParams: {
    path: z.object({
      bountyId: z.string().meta({ description: "The ID of the bounty" }),
      submissionId: z
        .string()
        .meta({ description: "The ID of the bounty submission" }),
    }),
  },
  requestBody: {
    content: {
      "application/json": {
        schema: rejectBountySubmissionBodySchema.optional(),
      },
    },
  },
  responses: {
    "200": {
      description: "The rejected bounty submission.",
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
