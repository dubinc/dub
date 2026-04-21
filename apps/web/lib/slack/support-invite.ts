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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(`${SLACK_API}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    throw new DubApiError({
      code: "internal_server_error",
      message: isTimeout
        ? "Slack API request timed out. Please try again."
        : "Could not reach the Slack API. Please try again.",
    });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    throw new DubApiError({
      code: "rate_limit_exceeded",
      message: "Too many Slack requests. Please try again shortly.",
    });
  }

  if (!response.ok) {
    console.error("[slack] unexpected HTTP error", {
      method,
      status: response.status,
      statusText: response.statusText,
    });
    throw new DubApiError({
      code: "internal_server_error",
      message: "Slack API returned an unexpected error. Please try again.",
    });
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Could not parse Slack API response. Please try again.",
    });
  }
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

async function createSharedCustomerChannel(
  workspaceSlug: string,
): Promise<{ channelId: string } | { nameTaken: true }> {
  const name = sharedSupportChannelName(workspaceSlug);

  const created = await slackWebApi<SlackConversationsCreateResponse>(
    "conversations.create",
    { name, is_private: false },
  );

  if (created.ok && created.channel?.id) {
    return { channelId: created.channel.id };
  }

  if (created.error === "name_taken") {
    console.warn("[slack] conversations.create name_taken", { name });
    return { nameTaken: true };
  }

  console.error("[slack] conversations.create failed", {
    error: created.error,
    needed: created.needed,
    messages: created.response_metadata?.messages,
  });
  throw mapSlackChannelEnsureError(created.error);
}

async function sendSlackConnectInvite(
  channelId: string,
  email: string,
): Promise<string> {
  await inviteInternalSupportMembersToChannel(channelId);

  const data = await slackWebApi<SlackInviteSharedResponse>(
    "conversations.inviteShared",
    { channel: channelId, emails: [email] },
  );

  if (!data.ok || !data.invite_id) {
    console.error("[slack] conversations.inviteShared failed", {
      error: data.error,
      needed: data.needed,
      messages: data.response_metadata?.messages,
    });
    throw mapSlackInviteError(data.error);
  }

  return data.invite_id;
}

export async function requestSlackConnectSupportInvite({
  email,
  workspaceSlug,
}: {
  email: string;
  workspaceSlug: string;
}): Promise<{ inviteId: string }> {
  if (!process.env.SLACK_SUPPORT_BOT_TOKEN) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Priority Slack support is not available right now.",
    });
  }

  const result = await createSharedCustomerChannel(workspaceSlug);

  if ("nameTaken" in result) {
    throw new DubApiError({
      code: "conflict",
      message:
        "Your workspace already has a Dub support channel. Ask your Slack admin to add you to it.",
    });
  }

  return { inviteId: await sendSlackConnectInvite(result.channelId, email) };
}

export async function inviteToSlackSupportChannel({
  email,
  workspaceSlug,
  channelId,
}: {
  email: string;
  workspaceSlug: string;
  channelId?: string;
}): Promise<
  | { inviteId: string; nameTaken?: never }
  | { nameTaken: true; inviteId?: never }
> {
  if (!process.env.SLACK_SUPPORT_BOT_TOKEN) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Priority Slack support is not available right now.",
    });
  }

  let resolvedChannelId = channelId;

  if (!resolvedChannelId) {
    const result = await createSharedCustomerChannel(workspaceSlug);
    if ("nameTaken" in result) {
      return { nameTaken: true };
    }
    resolvedChannelId = result.channelId;
  }

  return { inviteId: await sendSlackConnectInvite(resolvedChannelId, email) };
}
