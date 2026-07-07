import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { prisma } from "@/lib/prisma";
import { ClickEventTB } from "@/lib/types";
import { getSearchParams } from "@dub/utils";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils/src/constants/integrations";
import { Customer } from "@prisma/client";
import { googleAdsProvider } from "./provider";
import { googleAdsSettingsSchema, GoogleClickId } from "./schema";

const GOOGLE_CLICK_ID_PARAMS = ["gclid", "wbraid", "gbraid"] as const;

export async function trackGoogleAdsLead({
  workspaceId,
  clickData,
  eventId,
  timestamp,
}: {
  workspaceId: string;
  clickData: Pick<ClickEventTB, "url">;
  eventId: string;
  timestamp: string;
}) {
  const installation = await prisma.installedIntegration.findFirst({
    where: {
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      projectId: workspaceId,
    },
  });

  if (!installation) {
    return;
  }

  const settings = googleAdsSettingsSchema.safeParse(
    installation.settings ?? {},
  );

  if (
    !settings.success ||
    !settings.data.leadConversionActionId ||
    !settings.data.customerId
  ) {
    return;
  }

  const clickId = extractGoogleClickId(clickData.url);

  if (!clickId) {
    return;
  }

  await googleAdsProvider.ingestConversion({
    customerId: settings.data.customerId,
    conversion: {
      conversionActionId: settings.data.leadConversionActionId,
      ...clickId,
      conversionValue: 0,
      eventTimestamp: formatGoogleAdsEventTimestamp(timestamp),
      transactionId: eventId,
    },
  });
}

export async function trackGoogleAdsSale({
  workspaceId,
  clickData,
  customer,
  linkId,
  eventId,
  timestamp,
  saleAmount,
}: {
  workspaceId: string;
  clickData: Pick<ClickEventTB, "url">;
  customer: Pick<Customer, "sales" | "linkId">;
  linkId?: string;
  eventId: string;
  timestamp: string;
  saleAmount: number;
}) {
  const installation = await prisma.installedIntegration.findFirst({
    where: {
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      projectId: workspaceId,
    },
  });

  if (!installation) {
    return;
  }

  const settings = googleAdsSettingsSchema.safeParse(
    installation.settings ?? {},
  );

  if (
    !settings.success ||
    !settings.data.saleConversionActionId ||
    !settings.data.customerId
  ) {
    return;
  }

  if (!isFirstConversion({ customer, linkId })) {
    return;
  }

  const clickId = extractGoogleClickId(clickData.url);

  if (!clickId) {
    return;
  }

  // Dub stores sale amounts in cents; Google Ads expects currency units (e.g. dollars).
  const conversionValue = saleAmount / 100;

  await googleAdsProvider.ingestConversion({
    customerId: settings.data.customerId,
    conversion: {
      conversionActionId: settings.data.saleConversionActionId,
      ...clickId,
      conversionValue,
      eventTimestamp: formatGoogleAdsEventTimestamp(timestamp),
      transactionId: eventId,
    },
  });
}

// Parse gclid / wbraid / gbraid from a click destination URL.
const extractGoogleClickId = (url: string): GoogleClickId | null => {
  if (!url) {
    return null;
  }

  const params = getSearchParams(url);

  for (const key of GOOGLE_CLICK_ID_PARAMS) {
    const value = params[key];

    if (value) {
      return { [key]: value };
    }
  }

  return null;
};

// Tinybird click/lead timestamps are UTC without a suffix; match track-lead's clickedAt handling.
const formatGoogleAdsEventTimestamp = (timestamp: string | Date): string => {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  const normalized =
    timestamp.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(timestamp)
      ? timestamp
      : `${timestamp}Z`;

  return new Date(normalized).toISOString();
};
