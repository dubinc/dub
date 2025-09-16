import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import {
  HUBSPOT_CLIENT_ID,
  HUBSPOT_CLIENT_SECRET,
  HUBSPOT_REDIRECT_URI,
  HUBSPOT_STATE_CACHE_PREFIX,
} from "@/lib/integrations/hubspot/constants";
import { installIntegration } from "@/lib/integrations/install";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";
import { getSearchParams } from "@dub/utils";
import { refreshAccessToken } from "app/api/oauth/token/refresh-access-token";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const oAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

// GET /api/hubspot/callback - OAuth callback from HubSpot
export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  let workspace: Pick<Project, "id" | "slug" | "plan"> | null = null;

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

    const { code, state } = oAuthCallbackSchema.parse(getSearchParams(req.url));

    // Find workspace that initiated the install
    const workspaceId = await redis.get<string>(
      `${HUBSPOT_STATE_CACHE_PREFIX}:${state}`,
    );

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
        plan: true,
      },
    });

    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: HUBSPOT_REDIRECT_URI,
      client_id: HUBSPOT_CLIENT_ID,
      client_secret: HUBSPOT_CLIENT_SECRET,
    });

    // Exchange authorization code for access token
    const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
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

    // Install the integration
    await installIntegration({
      integrationId: integration.id,
      userId: session.user.id,
      workspaceId,
      credentials: {
        ...result,
        created_at: Date.now(),
      },
    });
  } catch (e: any) {
    return handleAndReturnErrorResponse(e);
  }

  redirect(`/${workspace.slug}/settings/integrations/hubspot`);
};
