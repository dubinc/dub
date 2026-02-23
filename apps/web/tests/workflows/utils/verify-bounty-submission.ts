import { expect } from "vitest";
import { HttpClient } from "../../utils/http";

interface VerifyBountySubmissionProps {
  http: HttpClient;
  bountyId: string;
  partnerId: string;
  expectedStatus?: "draft" | "submitted" | "approved" | "rejected";
  minPerformanceCount?: number;
}

const POLL_INTERVAL_MS = 5000; // 5 seconds
const TIMEOUT_MS = 60000; // 60 seconds

export const verifyBountySubmission = async ({
  http,
  bountyId,
  partnerId,
  expectedStatus = "submitted",
  minPerformanceCount,
}: VerifyBountySubmissionProps) => {
  const startTime = Date.now();

  let lastSubmission: any = null;

  while (Date.now() - startTime < TIMEOUT_MS) {
    const { data: submissions } = await http.get<any[]>({
      path: `/bounties/${bountyId}/submissions`,
      query: { partnerId },
    });

    const submission = submissions?.[0];
    lastSubmission = submission;

    if (
      submission &&
      submission.status === expectedStatus &&
      (minPerformanceCount === undefined ||
        (submission.performanceCount ?? 0) >= minPerformanceCount)
    ) {
      expect(submission.status).toBe(expectedStatus);

      if (minPerformanceCount !== undefined) {
        expect(submission.performanceCount).toBeGreaterThanOrEqual(
          minPerformanceCount,
        );
      }

      if (expectedStatus === "submitted") {
        expect(submission.completedAt).not.toBeNull();
      }

      return submission;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  const lastState = lastSubmission
    ? `Last seen: status="${lastSubmission.status}", performanceCount=${lastSubmission.performanceCount}`
    : "No submission found";

  throw new Error(
    `Bounty submission did not reach status "${expectedStatus}" within ${TIMEOUT_MS / 1000} seconds. ` +
      `bountyId: ${bountyId}, partnerId: ${partnerId}. ${lastState}`,
  );
};
