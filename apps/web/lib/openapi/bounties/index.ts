import { ZodOpenApiPathsObject } from "zod-openapi";
import { approveBountySubmission } from "./approve-bounty-submission";
import { getBountySubmission } from "./get-bounty-submission";
import { listBountySubmissions } from "./list-bounty-submissions";
import { rejectBountySubmission } from "./reject-bounty-submission";

export const bountiesPaths: ZodOpenApiPathsObject = {
  "/bounties/{bountyId}/submissions": {
    get: listBountySubmissions,
  },
  "/bounties/{bountyId}/submissions/{submissionId}": {
    get: getBountySubmission,
  },
  "/bounties/{bountyId}/submissions/{submissionId}/approve": {
    post: approveBountySubmission,
  },
  "/bounties/{bountyId}/submissions/{submissionId}/reject": {
    post: rejectBountySubmission,
  },
};
