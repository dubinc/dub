import { DubApiError } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import {
  GoogleAdsApi,
  inferLoginCustomerId,
} from "@/lib/integrations/google-ads/api";
import { googleAdsOAuthProvider } from "@/lib/integrations/google-ads/oauth";
import {
  googleAdsAuthTokenSchema,
  googleAdsSettingsSchema,
} from "@/lib/integrations/google-ads/schema";
import { installIntegration } from "@/lib/integrations/install";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// GET /api/gad/callback - OAuth callback from Google Ads
export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);

  const session = await getSession();

  if (!session?.user.id) {
    const callbackPath = `/api/gad/callback?${searchParams.toString()}`;
    redirect(`/login?next=${encodeURIComponent(callbackPath)}`);
  }

  const integration = await prisma.integration.findFirstOrThrow({
    where: {
      id: GOOGLE_ADS_INTEGRATION_ID,
    },
    select: {
      slug: true,
    },
  });

  let workspaceSlug: string | null = null;
  let errorMessage: string | null = null;

  try {
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
            defaultFolderId: true,
          },
        },
      },
    });

    workspaceSlug = workspace.slug;

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
  } catch (error) {
    errorMessage =
      error instanceof DubApiError || error instanceof Error
        ? error.message
        : "Failed to connect Google Ads. Please try again.";
  }

  if (!workspaceSlug) {
    redirect(
      `/login?error=${encodeURIComponent(errorMessage || "Failed to connect Google Ads. Please try again.")}`,
    );
  }

  redirectToIntegrationPage({
    workspaceSlug,
    integrationSlug: integration.slug,
    error: errorMessage ?? undefined,
  });
};

const redirectToIntegrationPage = ({
  workspaceSlug,
  integrationSlug,
  error,
}: {
  workspaceSlug: string;
  integrationSlug: string;
  error?: string;
}) => {
  const params = new URLSearchParams();

  if (error) {
    params.set("error", error);
  }

  const query = params.toString();

  redirect(
    `/${workspaceSlug}/settings/integrations/${integrationSlug}${query ? `?${query}` : ""}`,
  );
};
