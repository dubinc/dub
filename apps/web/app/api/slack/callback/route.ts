import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { installIntegration } from "@/lib/integrations/install";
import { slackOAuthProvider } from "@/lib/integrations/slack/oauth";
import { SlackAuthToken } from "@/lib/integrations/types";
import { createWebhook } from "@/lib/webhook/create-webhook";
import { prisma } from "@dub/prisma";
import { Project, WebhookReceiver } from "@dub/prisma/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const GET = async (req: Request) => {
  let workspace: Pick<Project, "id" | "slug" | "plan"> | null = null;

  try {
    const session = await getSession();

    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Unauthorized",
      });
    }

    const { token, contextId: workspaceId } =
      await slackOAuthProvider.exchangeCodeForToken(req);

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

    const integration = await prisma.integration.findUniqueOrThrow({
      where: {
        slug: "slack",
      },
      select: {
        id: true,
      },
    });

    const credentials: SlackAuthToken = {
      appId: token.app_id,
      botUserId: token.bot_user_id,
      scope: token.scope,
      accessToken: token.access_token,
      tokenType: token.token_type,
      authUser: token.authed_user,
      team: token.team,
      incomingWebhook: {
        channel: token.incoming_webhook.channel,
        channelId: token.incoming_webhook.channel_id,
      },
    };

    const installation = await installIntegration({
      integrationId: integration.id,
      userId: session.user.id,
      workspaceId,
      credentials,
    });

    await createWebhook({
      name: "Slack",
      url: token.incoming_webhook.url,
      receiver: WebhookReceiver.slack,
      triggers: [],
      workspace,
      installationId: installation.id,
    });
  } catch (e: any) {
    return handleAndReturnErrorResponse(e);
  }

  redirect(`/${workspace.slug}/settings/integrations/slack`);
};
