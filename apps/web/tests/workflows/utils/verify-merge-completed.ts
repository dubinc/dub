import {
  VITEST_POLL_INTERVAL_MS,
  VITEST_TEST_TIMEOUT_MS,
} from "@/lib/constants/misc";
import { EnrolledPartnerProps } from "@/lib/types";
import { expect } from "vitest";
import { HttpClient } from "../../utils/http";

interface VerifyMergeCompletedProps {
  http: HttpClient;
  sourcePartnerId: string;
  targetPartnerId: string;
  // A link id that belonged to the source partner and should end up on the target
  expectedLinkId: string;
}

/**
 * Polls until the merge-partner-account workflow has finished:
 * - the source partner is deleted (GET /partners/:id returns 404), and
 * - the target partner now owns the source's moved link.
 */
export const verifyMergeCompleted = async ({
  http,
  sourcePartnerId,
  targetPartnerId,
  expectedLinkId,
}: VerifyMergeCompletedProps) => {
  const startTime = Date.now();

  let lastSourceStatus: number | null = null;
  let lastTargetLinkIds: string[] = [];

  while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
    const [sourceRes, targetRes] = await Promise.all([
      http.get<{ error?: unknown }>({ path: `/partners/${sourcePartnerId}` }),
      http.get<EnrolledPartnerProps>({ path: `/partners/${targetPartnerId}` }),
    ]);

    lastSourceStatus = sourceRes.status;

    const sourceDeleted = sourceRes.status === 404;
    const targetLinks =
      targetRes.status === 200 ? targetRes.data.links ?? [] : [];
    lastTargetLinkIds = targetLinks.map((link) => link.id);
    const targetOwnsLink = lastTargetLinkIds.includes(expectedLinkId);

    if (sourceDeleted && targetOwnsLink) {
      expect(sourceRes.status).toBe(404);
      expect(lastTargetLinkIds).toContain(expectedLinkId);
      return targetRes.data;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, VITEST_POLL_INTERVAL_MS),
    );
  }

  throw new Error(
    `Merge did not complete within ${VITEST_TEST_TIMEOUT_MS / 1000} seconds. ` +
      `sourcePartnerId: ${sourcePartnerId} (last status: ${lastSourceStatus}), ` +
      `targetPartnerId: ${targetPartnerId}, expectedLinkId: ${expectedLinkId}. ` +
      `Last seen target link ids: [${lastTargetLinkIds.join(", ")}]`,
  );
};
