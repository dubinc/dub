import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import {
  HUBSPOT_API_HOST,
  HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET,
  HUBSPOT_REDIRECT_URI,
  HUBSPOT_STATE_CACHE_PREFIX,
} from "@/lib/integrations/hubspot/constants";
import { hubSpotAuthTokenSchema } from "@/lib/integrations/hubspot/schema";
import { installIntegration } from "@/lib/integrations/install";
import { WorkspaceProps } from "@/lib/types";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const oAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

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
    if (!HUBSPOT_CLIENT_ID || !HUBSPOT_CLIENT_SECRET) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Missing HubSpot OAuth credentials (client id/secret).",
      });
    }

    const session = await getSession();

    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Unauthorized. Please login to continue.",
      });
    }

    const { code, state } = oAuthCallbackSchema.parse(getSearchParams(req.url));

    const stateKey = `${HUBSPOT_STATE_CACHE_PREFIX}:${state}`;

    // Find workspace that initiated the install
    const workspaceId = await redis.getdel<string>(stateKey);

    if (!workspaceId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Unknown state. Please try again.",
      });
    }

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

    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: HUBSPOT_REDIRECT_URI,
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
    });

    // Exchange authorization code for access token
    const response = await fetch(`${HUBSPOT_API_HOST}/oauth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(result);

      throw new DubApiError({
        code: "bad_request",
        message:
          "[HubSpot] Failed to exchange authorization code for access token",
      });
    }

    // Find the integration
    const integration = await prisma.integration.findUniqueOrThrow({
      where: {
        slug: "hubspot",
      },
    });

    const credentials = hubSpotAuthTokenSchema.parse({
      ...result,
      created_at: Date.now(),
    });

    // Install the integration
    await installIntegration({
      integrationId: integration.id,
      userId: session.user.id,
      workspaceId,
      credentials,
    });
  } catch (e: any) {
    return handleAndReturnErrorResponse(e);
  }

  redirect(`/${workspace.slug}/settings/integrations/hubspot`);
};
