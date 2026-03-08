import { expect } from "vitest";
import { HttpClient } from "../../utils/http";

interface VerifyCampaignSentProps {
  http: HttpClient;
  campaignId: string;
  partnerId: string;
}

const POLL_INTERVAL_MS = 5000; // 5 seconds
const TIMEOUT_MS = 60000; // 60 seconds

export const verifyCampaignSent = async ({
  http,
  campaignId,
  partnerId,
}: VerifyCampaignSentProps) => {
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    const { data: emails } = await http.get<any[]>({
      path: "/e2e/notification-emails",
      query: { campaignId, partnerId },
    });

    const emailSent = emails?.[0];

    if (emailSent) {
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
