import { checkFeaturesAccessAuthLess, FeaturesAccess } from '@/lib/actions/check-features-access-auth-less';
import { ClicksThresholds, TrialClicks, TrialClicksForTest } from '@/lib/constants/trial';
import { conn } from '@/lib/planetscale';
import { EAnalyticEvents } from 'core/integration/analytic/interfaces/analytic.interface';
import { trackMixpanelApiService } from 'core/integration/analytic/services/track-mixpanel-api.service';

const auth = Buffer.from(
  `${process.env.CUSTOMER_IO_SITE_ID}:${process.env.CUSTOMER_IO_TRACK_API_KEY}`,
).toString("base64");

export const trackCustomerioEvent = async (link: Record<string, any>, eventName: string, data: Record<string, any>) => {
  return await fetch(
    `https://track.customer.io/api/v1/customers/${link.userId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: eventName,
        data,
      }),
    },
  );
}

const sendThresholdEvents = async (link: Record<string, any>, featuresAccess: FeaturesAccess) => {
  ClicksThresholds.forEach(async threshold => {
    const clicksThreshold =
      process.env.NEXT_PUBLIC_APP_ENV === "dev"
        ? threshold.thresholdForTest - 1
        : threshold.threshold - 1;
    if (link.totalUserClicks === clicksThreshold && !featuresAccess.featuresAccess) {
      const responses = await Promise.all([
        trackCustomerioEvent(link, "threshold_passed", {
          codes: threshold.threshold,
          qr_name: link.qrName,
        }),
        trackMixpanelApiService({
          event: EAnalyticEvents.THRESHOLD_PASSED,
          email: link.userEmail,
          userId: link.userId,
          params: {
            codes: threshold.threshold,
            timestamp: new Date().toISOString(),
          },
        })
      ]);

      if (!responses[0].ok) {
        throw new Error(
          `CustomerIo request failed: ${responses[0].status} ${await responses[0].text()}`,
        );
      }

      if (!responses[1].ok) {
        throw new Error(
          `Mixpanel request failed: ${responses[1].status} ${await responses[1].text()}`,
        );
      }
    }
  });
}

export const sendClicksEvents = async (linkId: string) => {
  console.log("Sending scan limit reached event for link", linkId);

  try {
    const linkRows = await conn.execute(
      `SELECT l.*, u.id as userId, u.email as userEmail,
        (SELECT SUM(clicks) FROM Link WHERE userId = u.id) as totalUserClicks,
        qr.title as qrName
      FROM Link l 
      LEFT JOIN User u ON l.userId = u.id
      LEFT JOIN Qr qr ON l.id = qr.linkId
      WHERE l.id = ?`,
      [linkId],
    );

    const link = linkRows.rows?.[0];

    console.log("Link", link);

    const featuresAccess = await checkFeaturesAccessAuthLess(link.userId, true);
    
    const maxClicks =
      process.env.NEXT_PUBLIC_APP_ENV === "dev"
        ? TrialClicksForTest - 1
        : TrialClicks - 1;

    sendThresholdEvents(link, featuresAccess);

    if (link.totalUserClicks >= maxClicks && !featuresAccess.featuresAccess) {
      const responses = await Promise.all([
        trackCustomerioEvent(link, "trial_expired", {
          codes: TrialClicks,
          qr_name: link.qrName,
        }),
        trackMixpanelApiService({
          event: EAnalyticEvents.TRIAL_EXPIRED,
          email: link.userEmail,
          userId: link.userId,
          params: {
            codes: TrialClicks,
            timestamp: new Date().toISOString(),
          },
        })
      ]);

      if (!responses[0].ok) {
        throw new Error(
          `CustomerIo request failed: ${responses[0].status} ${await responses[0].text()}`,
        );
      }

      if (!responses[1].ok) {
        throw new Error(
          `Mixpanel request failed: ${responses[1].status} ${await responses[1].text()}`,
        );
      }
    }
  } catch (error) {
    console.error(
      "Error sending scan limit reached event for link",
      linkId,
      error,
    );
  }
};