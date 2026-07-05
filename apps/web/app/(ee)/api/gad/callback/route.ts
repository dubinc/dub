import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { GoogleAdsApi } from "@/lib/integrations/google-ads/client";
import { googleAdsOAuthProvider } from "@/lib/integrations/google-ads/oauth";
import { googleAdsCredentialsSchema } from "@/lib/integrations/google-ads/schema";
import { installIntegration } from "@/lib/integrations/install";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// GET /api/gad/callback - OAuth callback from Google Ads
export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  let workspace: Pick<WorkspaceProps, "id" | "slug" | "users"> | null = null;

  // Local development redirect since the callback might be coming through ngrok
  if (
    process.env.NODE_ENV === "development" &&
    !req.headers.get("host")?.includes("localhost")
  ) {
    return redirect(
      `http://localhost:8888/api/gad/callback?${searchParams.toString()}`,
    );
  }

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

    // Check if the user is a member of the workspace
    if (workspace.users.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "You are not a member of this workspace.",
      });
    }

    // Check if the user is an owner of the workspace
    if (workspace.users[0].role !== "owner") {
      throw new DubApiError({
        code: "bad_request",
        message: "Only workspace owners can install integrations.",
      });
    }

    const integration = await prisma.integration.findUniqueOrThrow({
      where: {
        slug: "google-ads",
      },
      select: {
        id: true,
      },
    });

    // Discover which Google Ads accounts the connected user can access.
    // Non-fatal: if the developer token isn't approved yet, still store the tokens.
    let customerIds: string[] = [];
    try {
      const googleAds = new GoogleAdsApi({ accessToken: token.access_token });
      customerIds = await googleAds.listAccessibleCustomers();
    } catch (error) {
      console.error("[Google Ads] Failed to list accessible customers", error);
    }

    const credentials = googleAdsCredentialsSchema.parse({
      ...token,
      created_at: Date.now(),
      access_token: encrypt(token.access_token),
      refresh_token: token.refresh_token
        ? encrypt(token.refresh_token)
        : undefined,
      customerIds,
    });

    await installIntegration({
      integrationId: integration.id,
      userId: session.user.id,
      workspaceId,
      credentials,
    });
  } catch (e: any) {
    return handleAndReturnErrorResponse(e);
  }

  redirect(`/${workspace.slug}/settings/integrations/google-ads`);
};
