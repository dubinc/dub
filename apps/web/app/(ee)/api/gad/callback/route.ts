import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { GoogleAdsClient } from "@/lib/integrations/google-ads/client";
import { googleAdsOAuthProvider } from "@/lib/integrations/google-ads/oauth";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils/src";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// GET /api/gad/callback - OAuth callback from Google Ads
export const GET = async (req: Request) => {
  try {
    const session = await getSession();

    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Unauthorized. Please login to continue.",
      });
    }

    const { token, contextId: workspaceId } =
      await googleAdsOAuthProvider.exchangeCodeForToken<string>(req);

    const workspace = await prisma.project.findUniqueOrThrow({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (workspace.users.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "You are not a member of this workspace.",
      });
    }

    if (workspace.users[0].role !== "owner") {
      throw new DubApiError({
        code: "bad_request",
        message: "Only workspace owners can install integrations.",
      });
    }

    const { canInstallAdvancedIntegrations } = getPlanCapabilities(
      workspace.plan,
    );

    if (!canInstallAdvancedIntegrations) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Google Ads integration is only available on Advanced and Enterprise plans.",
      });
    }

    const integration = await prisma.integration.findUniqueOrThrow({
      where: {
        id: GOOGLE_ADS_INTEGRATION_ID,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    const googleAds = GoogleAdsClient.withAdvertiserToken(token.access_token);

    const customerIds = await googleAds.listAccessibleCustomers();

    if (customerIds.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "No Google Ads accounts found for this Google account. Please connect a different Google account.",
      });
    }

    const authToken = {
      ...token,
      created_at: Date.now(),
    };

    await GoogleAdsClient.completeInstall({
      authToken,
      customerId: customerIds.length === 1 ? customerIds[0] : null,
      customerIds,
      workspaceId,
      userId: session.user.id,
      integrationId: integration.id,
    });

    redirect(`/${workspace.slug}/settings/integrations/${integration.slug}`);
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) {
      throw e;
    }

    return handleAndReturnErrorResponse(e);
  }
};
