import { prisma } from "../../utils/prisma";
import { expect } from "vitest";

interface VerifyPartnerGroupMoveProps {
  partnerId: string;
  programId: string;
  expectedGroupId: string;
}

const POLL_INTERVAL_MS = 5000; // 5 seconds
const TIMEOUT_MS = 60000; // 60 seconds

export const verifyPartnerGroupMove = async ({
  partnerId,
  programId,
  expectedGroupId,
}: VerifyPartnerGroupMoveProps) => {
  const startTime = Date.now();
  let lastGroupId: string | null = null;

  while (Date.now() - startTime < TIMEOUT_MS) {
    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
        groupId: true,
        clickRewardId: true,
        leadRewardId: true,
        saleRewardId: true,
        discountId: true,
      },
    });

    lastGroupId = enrollment?.groupId ?? null;

    if (enrollment?.groupId === expectedGroupId) {
      expect(enrollment.groupId).toBe(expectedGroupId);
      return enrollment;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Partner group move not found within ${TIMEOUT_MS / 1000} seconds. ` +
      `partnerId: ${partnerId}, expectedGroupId: ${expectedGroupId}. ` +
      `Last seen groupId: ${lastGroupId}`,
  );
};
