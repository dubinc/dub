import { getErrorMetadata, logger } from "@/lib/axiom/server";
import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  getSearchParams,
  GOOGLE_ADS_INTEGRATION_ID,
} from "@dub/utils";
import * as z from "zod/v4";
import { GoogleAdsApi, GoogleAdsClickId } from "./api";
import { googleAdsInstalledWorkspaces } from "./installed-workspaces";
import { googleAdsOAuthProvider } from "./oauth";
import {
  googleAdsConversionUploadSchema,
  googleAdsSettingsSchema,
} from "./schema";

const extractGoogleAdsClickId = (url: string): GoogleAdsClickId | null => {
  const queryParams = getSearchParams(url);

  if (queryParams.gclid) {
    return {
      gclid: queryParams.gclid,
    };
  }

  if (queryParams.gbraid) {
    return {
      gbraid: queryParams.gbraid,
    };
  }

  if (queryParams.wbraid) {
    return {
      wbraid: queryParams.wbraid,
    };
  }

  return null;
};

export const queueGoogleAdsConversionUpload = async (
  payload: z.infer<typeof googleAdsConversionUploadSchema>,
) => {
  if (!extractGoogleAdsClickId(payload.click.url)) {
    return;
  }

  if (!(await googleAdsInstalledWorkspaces.has(payload.workspaceId))) {
    return;
  }

  try {
    const response = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/google-ads/upload-conversion`,
      body: payload,
      retries: 3,
      deduplicationId: `google-ads-${payload.workspaceId}-${payload.eventId}`,
    });

    if (!response.messageId) {
      throw new Error("Failed to queue Google Ads conversion upload");
    }

    return response;
  } catch (error) {
    logger.error("google-ads.queue_conversion_failed", {
      service: "google-ads",
      ...getErrorMetadata(error),
      correlation: {
        workspaceId: payload.workspaceId,
        eventId: payload.eventId,
        eventType: payload.eventType,
        clickId: payload.click.id,
      },
    });

    await logger.flush();
    throw error;
  }
};

export type GoogleAdsConversionUploadResult = {
  message: string;
  status: "failed" | "skipped" | "uploaded";
};

export const uploadGoogleAdsConversion = async (
  payload: z.infer<typeof googleAdsConversionUploadSchema>,
): Promise<GoogleAdsConversionUploadResult> => {
  const {
    workspaceId,
    eventType,
    click,
    conversionDateTime,
    eventId,
    conversionValue,
    currencyCode,
    conversionCount,
  } = googleAdsConversionUploadSchema.parse(payload);

  try {
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
      return {
        message: `Google Ads integration not installed for workspace ${workspaceId}. Skipping...`,
        status: "skipped",
      };
    }

    const settings = googleAdsSettingsSchema.parse(
      installedIntegration.settings ?? {},
    );

    const conversionAction =
      eventType === "lead"
        ? settings.leadConversionAction
        : settings.saleConversionAction;

    if (!settings.customerId || !conversionAction) {
      return {
        message: `Missing ${!settings.customerId ? "customerId" : `${eventType}ConversionAction`}. Skipping...`,
        status: "skipped",
      };
    }

    const googleClickId = extractGoogleAdsClickId(click.url);

    if (!googleClickId) {
      return {
        message: `No gclid/gbraid/wbraid found on click ${click.id}. Skipping...`,
        status: "skipped",
      };
    }

    const token =
      await googleAdsOAuthProvider.getAccessToken(installedIntegration);

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

    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await googleAdsApi.uploadClickConversion({
          customerId: settings.customerId,
          conversionAction,
          googleClickId,
          conversionDateTime,
          conversionValue,
          currencyCode,
          conversionCount,
          eventId,
        });

        return {
          message: `Uploaded ${eventType} conversion for workspace ${workspaceId} (requestId: ${response.requestId})`,
          status: "uploaded",
        };
      } catch (error) {
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, attempt)),
          );
          continue;
        }

        throw error;
      }
    }

    return {
      message: `Failed to upload ${eventType} conversion for workspace ${workspaceId}: unknown error`,
      status: "failed",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("google-ads.upload_conversion_failed", {
      service: "google-ads",
      ...getErrorMetadata(error),
      correlation: {
        workspaceId,
        eventId,
        eventType,
        clickId: click.id,
      },
    });

    await logger.flush();

    return {
      message: `Failed to upload ${eventType} conversion for workspace ${workspaceId}: ${errorMessage}`,
      status: "failed",
    };
  }
};
