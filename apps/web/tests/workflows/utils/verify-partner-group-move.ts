import { EnrolledPartnerProps } from "@/lib/types";
import { expect } from "vitest";
import { HttpClient } from "../../utils/http";

interface VerifyPartnerGroupMoveProps {
  http: HttpClient;
  partnerId: string;
  expectedGroupId: string;
  query?: Record<string, string>;
}

const POLL_INTERVAL_MS = 5000; // 5 seconds
const TIMEOUT_MS = 60000; // 60 seconds

export const verifyPartnerGroupMove = async ({
  http,
  partnerId,
  expectedGroupId,
  query = {},
}: VerifyPartnerGroupMoveProps) => {
  const startTime = Date.now();
  let lastGroupId: string | null = null;

  while (Date.now() - startTime < TIMEOUT_MS) {
    const { status, data: partner } = await http.get<EnrolledPartnerProps>({
      path: `/e2e/partners/${partnerId}`,
      query,
    });

    if (status !== 200) {
      throw new Error(
        `Failed to fetch partner: status=${status}, partnerId=${partnerId}`,
      );
    }

    lastGroupId = partner?.groupId ?? null;

    if (partner?.groupId === expectedGroupId) {
      expect(partner.groupId).toBe(expectedGroupId);
      return partner;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Partner group move not found within ${TIMEOUT_MS / 1000} seconds. ` +
      `partnerId: ${partnerId}, expectedGroupId: ${expectedGroupId}. ` +
      `Last seen groupId: ${lastGroupId}`,
  );
};
