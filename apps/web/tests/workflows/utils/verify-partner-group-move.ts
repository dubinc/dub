import {
  VITEST_POLL_INTERVAL_MS,
  VITEST_TEST_TIMEOUT_MS,
} from "@/lib/constants/misc";
import { EnrolledPartnerProps } from "@/lib/types";
import { expect } from "vitest";
import { HttpClient } from "../../utils/http";

interface VerifyPartnerGroupMoveProps {
  http: HttpClient;
  partnerId: string;
  expectedGroupId: string;
  query?: Record<string, string>;
}

export const verifyPartnerGroupMove = async ({
  http,
  partnerId,
  expectedGroupId,
  query = {},
}: VerifyPartnerGroupMoveProps) => {
  const startTime = Date.now();
  let lastGroupId: string | null = null;

  while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
    const { data: partner } = await http.get<EnrolledPartnerProps>({
      path: `/partners/${partnerId}`,
      query,
    });

    lastGroupId = partner?.groupId ?? null;

    if (partner?.groupId === expectedGroupId) {
      expect(partner.groupId).toBe(expectedGroupId);
      return partner;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, VITEST_POLL_INTERVAL_MS),
    );
  }

  throw new Error(
    `Partner group move not found within ${VITEST_TEST_TIMEOUT_MS / 1000} seconds. ` +
      `partnerId: ${partnerId}, expectedGroupId: ${expectedGroupId}. ` +
      `Last seen groupId: ${lastGroupId}`,
  );
};
