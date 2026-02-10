import { prisma } from "@dub/prisma";
import { expect } from "vitest";

interface VerifyCampaignSentProps {
  campaignId: string;
  partnerId: string;
}

const POLL_INTERVAL_MS = 5000; // 5 seconds
const TIMEOUT_MS = 30000; // 30 seconds

export const verifyCampaignSent = async ({
  campaignId,
  partnerId,
}: VerifyCampaignSentProps) => {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    const emailSent = await prisma.notificationEmail.findFirst({
      where: {
        campaignId,
        type: "Campaign",
        partnerId,
      },
    });

    if (emailSent) {
      expect(emailSent).toBeDefined();
      expect(emailSent.type).toBe("Campaign");
      expect(emailSent.campaignId).toBe(campaignId);
      expect(emailSent.partnerId).toBe(partnerId);
      return emailSent;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Campaign email not found within ${TIMEOUT_MS / 1000} seconds. ` +
      `campaignId: ${campaignId}, partnerId: ${partnerId}`,
  );
};
