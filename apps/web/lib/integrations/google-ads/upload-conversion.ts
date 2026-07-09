import { prisma } from "@/lib/prisma";
import { getClickEvent } from "@/lib/tinybird";
import { getSearchParams, GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import * as z from "zod/v4";
import {
  formatGoogleAdsConversionDateTime,
  GoogleAdsApi,
  GoogleAdsClickIds,
} from "./api";
import { googleAdsOAuthProvider } from "./oauth";
import {
  googleAdsConversionUploadSchema,
  googleAdsSettingsSchema,
} from "./schema";

const extractGoogleAdsClickIds = (url: string): GoogleAdsClickIds => {
  if (!url) {
    return {};
  }

  const queryParams = getSearchParams(url);

  return {
    ...(queryParams.gclid ? { gclid: queryParams.gclid } : {}),
    ...(queryParams.gbraid ? { gbraid: queryParams.gbraid } : {}),
    ...(queryParams.wbraid ? { wbraid: queryParams.wbraid } : {}),
  };
};

export const uploadGoogleAdsConversion = async (
  payload: z.infer<typeof googleAdsConversionUploadSchema>,
) => {
  const {
    workspaceId,
    eventType,
    clickId,
    conversionDateTime,
    eventId,
    conversionValue,
    currencyCode,
  } = googleAdsConversionUploadSchema.parse(payload);

  const installedIntegration = await prisma.installedIntegration.findFirst({
    where: {
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      projectId: workspaceId,
    },
    select: {
      id: true,
      settings: true,
      credentials: true,
    },
  });

  if (!installedIntegration) {
    console.warn(
      `[Google Ads] Skipping ${eventType} conversion upload: Google Ads integration not installed for workspace ${workspaceId}`,
    );
    return;
  }

  const settings = googleAdsSettingsSchema.parse(
    installedIntegration.settings ?? {},
  );

  const conversionAction =
    eventType === "lead"
      ? settings.leadConversionAction
      : settings.saleConversionAction;

  if (!settings.customerId || !conversionAction) {
    console.warn(
      `[Google Ads] Skipping ${eventType} conversion upload for workspace ${workspaceId}: missing ${!settings.customerId ? "customerId" : `${eventType}ConversionAction`}`,
    );
    return;
  }

  const clickEvent = await getClickEvent({ clickId });

  if (!clickEvent?.url) {
    console.warn(
      `[Google Ads] Skipping ${eventType} conversion upload for workspace ${workspaceId}: no click event URL found for clickId ${clickId}`,
    );
    return;
  }

  const clickIds = extractGoogleAdsClickIds(clickEvent.url);

  const hasGoogleAdsClickId = Boolean(
    clickIds.gclid || clickIds.gbraid || clickIds.wbraid,
  );

  if (!hasGoogleAdsClickId) {
    console.warn(
      `[Google Ads] Skipping ${eventType} conversion upload for workspace ${workspaceId}: no gclid/gbraid/wbraid found on click ${clickId}`,
    );
    return;
  }

  const token =
    await googleAdsOAuthProvider.refreshTokenForInstallation(
      installedIntegration,
    );

  let loginCustomerId: string | null = null;

  if (
    settings.loginCustomerId &&
    settings.loginCustomerId !== settings.customerId
  ) {
    loginCustomerId = settings.loginCustomerId;
  }

  const googleAdsApi = new GoogleAdsApi({
    accessToken: token.access_token,
    loginCustomerId,
    customerId: settings.customerId,
  });

  const response = await googleAdsApi.uploadClickConversion({
    customerId: settings.customerId,
    conversionAction,
    clickIds,
    conversionDateTime: formatGoogleAdsConversionDateTime(conversionDateTime),
    conversionValue,
    currencyCode,
    eventId,
  });

  console.log("uploadClickConversion response", response);

  const partialFailureError = (response as any)?.partialFailureError;

  if (partialFailureError?.message) {
    console.error(
      `[Google Ads] Partial failure uploading ${eventType} conversion for workspace ${workspaceId}:`,
      partialFailureError,
    );
    throw new Error(partialFailureError.message);
  }

  return response;
};
