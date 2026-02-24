import { openApiErrorResponses } from "@/lib/openapi/responses";
import {
  BountySubmissionSchema,
  getBountySubmissionsQuerySchema,
} from "@/lib/zod/schemas/bounties";
import { ZodOpenApiOperationObject } from "zod-openapi";
import * as z from "zod/v4";

export const listBountySubmissions: ZodOpenApiOperationObject = {
  operationId: "listBountySubmissions",
  "x-speakeasy-name-override": "listSubmissions",
  summary: "List bounty submissions",
  description:
    "List all submissions for a specific bounty in your partner program.",
  requestParams: {
    path: z.object({
      bountyId: z.string().meta({
        description:
          "The unique ID of the bounty on Dub. Can be found in the URL of the bounty page, prefixed with `bnty_`.",
      }),
    }),
    query: getBountySubmissionsQuerySchema,
  },
  responses: {
    "200": {
      description: "The list of bounty submissions.",
      content: {
        "application/json": {
          schema: z.array(BountySubmissionSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Bounties"],
  security: [{ token: [] }],
};
