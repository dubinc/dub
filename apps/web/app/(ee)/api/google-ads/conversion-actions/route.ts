import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import {
  GoogleAdsApi,
  getLoginCustomerIdCandidates,
} from "@/lib/integrations/google-ads/api";
import { googleAdsOAuthProvider } from "@/lib/integrations/google-ads/oauth";
import { googleAdsSettingsSchema } from "@/lib/integrations/google-ads/schema";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/google-ads/conversion-actions - List UPLOAD_CLICKS conversion actions for a customer
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { customerId } = z
      .object({
        customerId: z.string().min(1),
      })
      .parse(searchParams);

    const installedIntegration = await prisma.installedIntegration.findFirst({
      where: {
        integrationId: GOOGLE_ADS_INTEGRATION_ID,
        projectId: workspace.id,
      },
    });

    if (!installedIntegration) {
      throw new DubApiError({
        code: "bad_request",
        message: "Google Ads integration is not installed on your workspace.",
      });
    }

    const token =
      await googleAdsOAuthProvider.getAccessToken(installedIntegration);

    const currentSettings = googleAdsSettingsSchema.parse(
      installedIntegration.settings ?? {},
    );

    const normalizedCustomerId = customerId.replace(/-/g, "");
    const selectedCustomer = currentSettings.customers.find(
      (customer) => customer.id.replace(/-/g, "") === normalizedCustomerId,
    );

    if (!selectedCustomer) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "The selected Google Ads account is not available for this workspace. Please reconnect the integration.",
      });
    }

    const candidates = getLoginCustomerIdCandidates({
      customers: currentSettings.customers,
      selectedCustomerId: customerId,
      loginCustomerId: currentSettings.loginCustomerId,
    });

    let lastError: unknown;

    for (const loginCustomerId of candidates) {
      try {
        const googleAdsApi = new GoogleAdsApi({
          accessToken: token.access_token,
          loginCustomerId,
          customerId,
        });

        const conversionActions =
          await googleAdsApi.listUploadClickConversionActions(customerId);

        return NextResponse.json({
          conversionActions,
          loginCustomerId,
        });
      } catch (error) {
        lastError = error;

        const message = error instanceof Error ? error.message : String(error);

        if (!message.includes("USER_PERMISSION_DENIED")) {
          throw error;
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new DubApiError({
      code: "forbidden",
      message:
        "The Google Ads user does not have permission to access this account.",
    });
  },
  {
    requiredPermissions: ["integrations.write"],
    requiredPlan: ["advanced", "enterprise"],
  },
);
