import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import {
  GoogleAdsApi,
  inferLoginCustomerId,
} from "@/lib/integrations/google-ads/api";
import { googleAdsInstalledWorkspaces } from "@/lib/integrations/google-ads/installed-workspaces";
import { googleAdsOAuthProvider } from "@/lib/integrations/google-ads/oauth";
import {
  googleAdsAuthTokenSchema,
  googleAdsSettingsSchema,
} from "@/lib/integrations/google-ads/schema";
import { installIntegration } from "@/lib/integrations/install";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// GET /api/gad/callback - OAuth callback from Google Ads
export const GET = async (req: Request) => {
  let workspace:
    | (Pick<WorkspaceProps, "id" | "slug" | "users"> & { plan: string })
    | null = null;

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

    workspace = await prisma.project.findUniqueOrThrow({
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
            defaultFolderId: true,
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

    if (!getPlanCapabilities(workspace.plan).canInstallAdvancedIntegrations) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Google Ads integration is only available on Advanced and Enterprise plans.",
      });
    }

    const credentials = googleAdsAuthTokenSchema.parse({
      ...token,
      created_at: Date.now(),
      access_token: encrypt(token.access_token),
      refresh_token: encrypt(token.refresh_token),
    });

    const googleAdsApi = new GoogleAdsApi({
      accessToken: token.access_token,
    });

    const customers = await googleAdsApi.listAccessibleCustomers();

    let customerName: string | null = null;
    let customerId: string | null = null;
    let loginCustomerId: string | null = null;

    // Just one customer, so we can use the first one
    if (customers.length === 1) {
      customerName = customers[0].descriptiveName;
      customerId = customers[0].id;
      loginCustomerId = inferLoginCustomerId({
        customers,
        selectedCustomerId: customerId,
      });
    }

    const settings = googleAdsSettingsSchema.parse({
      customers,
      customerId,
      customerName,
      loginCustomerId,
    });

    await installIntegration({
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      userId: session.user.id,
      workspaceId,
      credentials,
      settings,
    });

    waitUntil(googleAdsInstalledWorkspaces.add(workspaceId));
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }

  redirect(`/${workspace.slug}/settings/integrations/google-ads`);
};
