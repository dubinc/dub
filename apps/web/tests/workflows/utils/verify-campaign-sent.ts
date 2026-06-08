import {
  VITEST_POLL_INTERVAL_MS,
  VITEST_TEST_TIMEOUT_MS,
} from "@/lib/constants/misc";
import { expect } from "vitest";
import { HttpClient } from "../../utils/http";

interface VerifyCampaignSentProps {
  http: HttpClient;
  campaignId: string;
  partnerId: string;
}

export const verifyCampaignSent = async ({
  http,
  campaignId,
  partnerId,
}: VerifyCampaignSentProps) => {
  const startTime = Date.now();

  while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
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

    await new Promise((resolve) =>
      setTimeout(resolve, VITEST_POLL_INTERVAL_MS),
    );
  }

  throw new Error(
    `Campaign email not found within ${VITEST_TEST_TIMEOUT_MS / 1000} seconds. ` +
      `campaignId: ${campaignId}, partnerId: ${partnerId}`,
  );
};
