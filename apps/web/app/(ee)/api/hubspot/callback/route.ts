import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { HubSpotApi } from "@/lib/integrations/hubspot/api";
import { HUBSPOT_DUB_CONTACT_PROPERTIES } from "@/lib/integrations/hubspot/constants";
import { hubSpotOAuthProvider } from "@/lib/integrations/hubspot/oauth";
import { installIntegration } from "@/lib/integrations/install";
import { WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// GET /api/hubspot/callback - OAuth callback from HubSpot
export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  let workspace: Pick<WorkspaceProps, "id" | "slug" | "users"> | null = null;

  // Local development redirect since the callback might be coming through ngrok
  if (
    process.env.NODE_ENV === "development" &&
    !req.headers.get("host")?.includes("localhost")
  ) {
    return redirect(
      `http://localhost:8888/api/hubspot/callback?${searchParams.toString()}`,
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
      await hubSpotOAuthProvider.exchangeCodeForToken(req);

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
        message: "You are not a member of this workspace. ",
      });
    }

    // Check if the user is an owner of the workspace
    if (workspace.users[0].role !== "owner") {
      throw new DubApiError({
        code: "bad_request",
        message: "Only workspace owners can install integrations. ",
      });
    }

    const integration = await prisma.integration.findUniqueOrThrow({
      where: {
        slug: "hubspot",
      },
    });

    const credentials = {
      ...token,
      created_at: Date.now(),
    };

    const installedIntegration = await installIntegration({
      integrationId: integration.id,
      userId: session.user.id,
      workspaceId,
      credentials,
    });

    if (installedIntegration) {
      const hubSpotApi = new HubSpotApi({
        token: credentials.access_token,
      });

      waitUntil(
        hubSpotApi.createPropertiesBatch({
          objectType: "0-1",
          properties: HUBSPOT_DUB_CONTACT_PROPERTIES,
        }),
      );
    }
  } catch (e: any) {
    return handleAndReturnErrorResponse(e);
  }

  redirect(`/${workspace.slug}/settings/integrations/hubspot`);
};
