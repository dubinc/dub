import { DubApiError } from "@/lib/api/errors";

type SlackOkResponse = {
  ok: boolean;
  error?: string;
  needed?: string;
  response_metadata?: { next_cursor?: string; messages?: string[] };
};

type SlackInviteSharedResponse = SlackOkResponse & {
  invite_id?: string;
};

type SlackConversationsCreateResponse = SlackOkResponse & {
  channel?: { id: string };
};

const SLACK_API = "https://slack.com/api";

const INTERNAL_USER_ID = /^[UW][A-Z0-9]{8,}$/i;

function parseSupportInternalUserIds(): string[] {
  const raw = process.env.SLACK_SUPPORT_INTERNAL_USER_IDS?.trim();
  if (!raw) {
    return [];
  }
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((id) => INTERNAL_USER_ID.test(id)),
    ),
  ];
}

async function inviteInternalSupportMembersToChannel(
  channelId: string,
): Promise<void> {
  const userIds = parseSupportInternalUserIds();
  if (userIds.length === 0) {
    return;
  }

  for (const user of userIds) {
    const data = await slackWebApi<SlackOkResponse>("conversations.invite", {
      channel: channelId,
      users: user,
    });

    if (data.ok) {
      continue;
    }

    if (data.error === "already_in_channel") {
      continue;
    }

    console.warn("[slack] conversations.invite internal member failed", {
      user,
      error: data.error,
      needed: data.needed,
    });
  }
}

export function sharedSupportChannelName(workspaceSlug: string): string {
  const base = workspaceSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const safeBase = base.length > 0 ? base : "workspace";
  const prefixed = `shared-${safeBase}`;
  return prefixed.length <= 80 ? prefixed : prefixed.slice(0, 80);
}

async function slackWebApi<T extends SlackOkResponse>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = process.env.SLACK_SUPPORT_BOT_TOKEN;
  if (!token) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Priority Slack support is not available right now.",
    });
  }

  const response = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
}

function mapSlackInviteError(slackError: string | undefined): DubApiError {
  switch (slackError) {
    case "restricted_action":
    case "team_access_not_granted":
      return new DubApiError({
        code: "forbidden",
        message:
          "Slack could not send this invite due to workspace permissions. Contact support if this persists.",
      });
    case "already_in_channel":
      return new DubApiError({
        code: "conflict",
        message: "This email may already have access to the support channel.",
      });
    case "channel_not_found":
    case "invalid_channel":
      return new DubApiError({
        code: "internal_server_error",
        message: "Support channel is misconfigured. Please try again later.",
      });
    case "invalid_email":
    case "invalid_arguments":
      return new DubApiError({
        code: "bad_request",
        message: "Invalid email address for Slack invite.",
      });
    case "missing_scope":
    case "not_allowed_token_type":
      return new DubApiError({
        code: "internal_server_error",
        message: "Slack support integration is misconfigured.",
      });
    case "rate_limited":
    case "ratelimited":
      return new DubApiError({
        code: "rate_limit_exceeded",
        message: "Too many Slack invite requests. Please try again shortly.",
      });
    default:
      return new DubApiError({
        code: "internal_server_error",
        message: "Could not send Slack invite. Please try again later.",
      });
  }
}

function mapSlackChannelEnsureError(
  slackError: string | undefined,
): DubApiError {
  if (
    slackError === "missing_scope" ||
    slackError === "not_allowed_token_type"
  ) {
    return new DubApiError({
      code: "internal_server_error",
      message: "Slack support integration is misconfigured.",
    });
  }
  if (slackError === "invalid_name") {
    return new DubApiError({
      code: "internal_server_error",
      message:
        "Could not create support channel for this workspace. Please contact support for help connecting Slack.",
    });
  }
  console.error("[slack] ensure customer channel failed", {
    slackError,
  });
  return new DubApiError({
    code: "internal_server_error",
    message:
      "Could not prepare your Slack support channel. Please contact support for help connecting Slack.",
  });
}

async function ensureSharedCustomerChannelId(
  workspaceSlug: string,
): Promise<string> {
  const name = sharedSupportChannelName(workspaceSlug);

  const created = await slackWebApi<SlackConversationsCreateResponse>(
    "conversations.create",
    {
      name,
      is_private: false,
    },
  );

  if (created.ok && created.channel?.id) {
    return created.channel.id;
  }

  if (created.error === "name_taken") {
    console.warn(
      "[slack] conversations.create name_taken; not resolving channel",
      {
        name,
      },
    );
    throw new DubApiError({
      code: "conflict",
      message:
        "Slack support could not be requested automatically for this workspace. Please contact Dub support for help connecting Slack.",
    });
  }

  console.error("[slack] conversations.create failed", {
    error: created.error,
    needed: created.needed,
    messages: created.response_metadata?.messages,
  });
  throw mapSlackChannelEnsureError(created.error);
}

export async function requestSlackConnectSupportInvite({
  email,
  workspaceSlug,
}: {
  email: string;
  workspaceSlug: string;
}): Promise<{
  inviteId: string;
}> {
  if (!process.env.SLACK_SUPPORT_BOT_TOKEN) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Priority Slack support is not available right now.",
    });
  }

  const channel = await ensureSharedCustomerChannelId(workspaceSlug);

  await inviteInternalSupportMembersToChannel(channel);

  const data = await slackWebApi<SlackInviteSharedResponse>(
    "conversations.inviteShared",
    {
      channel,
      emails: [email],
    },
  );

  if (!data.ok || !data.invite_id) {
    console.error("[slack] conversations.inviteShared failed", {
      error: data.error,
      needed: data.needed,
      messages: data.response_metadata?.messages,
    });
    throw mapSlackInviteError(data.error);
  }

  return { inviteId: data.invite_id };
}
