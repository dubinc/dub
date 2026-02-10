import { prisma } from "@dub/prisma";
import { expect } from "vitest";

interface VerifyBountySubmissionProps {
  bountyId: string;
  partnerId: string;
  expectedStatus?: "draft" | "submitted" | "approved" | "rejected";
  minPerformanceCount?: number;
}

const POLL_INTERVAL_MS = 5000; // 5 seconds
const TIMEOUT_MS = 30000; // 30 seconds

export const verifyBountySubmission = async ({
  bountyId,
  partnerId,
  expectedStatus = "submitted",
  minPerformanceCount,
}: VerifyBountySubmissionProps) => {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    const submission = await prisma.bountySubmission.findFirst({
      where: {
        bountyId,
        partnerId,
      },
    });

    if (submission) {
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

  throw new Error(
    `Bounty submission not found within ${TIMEOUT_MS / 1000} seconds. ` +
    `bountyId: ${bountyId}, partnerId: ${partnerId}`,
  );
};
