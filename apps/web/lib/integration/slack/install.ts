import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { installIntegration } from "@/lib/integration/install";
import { SlackCredential } from "@/lib/integration/slack/type";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { APP_DOMAIN_WITH_NGROK, getSearchParams, nanoid } from "@dub/utils";
import { Project } from "@prisma/client";
import { redirect } from "next/navigation";

const oAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

const envSchema = z.object({
  SLACK_APP_INSTALL_URL: z.string(),
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
});

// Install Slack integration and save credentials
export const installSlackIntegration = async (req: Request) => {
  let workspace: Pick<Project, "slug"> | null = null;

  try {
    const session = await getSession();

    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Unauthorized",
      });
    }

    const { code, state } = oAuthCallbackSchema.parse(getSearchParams(req.url));

    // Find workspace that initiated the Stripe app install
    const workspaceId = await redis.get<string>(`slack:install:state:${state}`);

    if (!workspaceId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Unknown state",
      });
    }

    workspace = await prisma.project.findFirstOrThrow({
      where: {
        id: workspaceId,
      },
      select: {
        slug: true,
      },
    });

    const formData = new FormData();
    formData.append("code", code);
    formData.append("client_id", `${process.env.SLACK_CLIENT_ID}`);
    formData.append("client_secret", `${process.env.SLACK_CLIENT_SECRET}`);

    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    const credentials: SlackCredential = {
      appId: data.app_id,
      botUserId: data.bot_user_id,
      scope: data.scope,
      accessToken: data.access_token,
      tokenType: data.token_type,
      authUser: data.authed_user,
      team: data.team,
    };

    await installIntegration({
      integrationSlug: "slack",
      userId: session.user.id,
      workspaceId,
      credentials,
    });
  } catch (e: any) {
    return handleAndReturnErrorResponse(e);
  }

  redirect(`/${workspace.slug}/settings/integrations/slack`);
};

// Get the installation URL for Slack
export const getSlackInstallationUrl = async (workspaceId: string) => {
  const state = nanoid(16);
  await redis.set(`slack:install:state:${state}`, workspaceId, {
    ex: 30 * 60,
  });

  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    throw new Error(
      "Slack App environment variables are not configured properly.",
    );
  }

  const url = new URL(env.data.SLACK_APP_INSTALL_URL);
  url.searchParams.set(
    "redirect_uri",
    `${APP_DOMAIN_WITH_NGROK}/api/slack/callback`,
  );
  url.searchParams.set("state", state);

  return url.toString();
};
