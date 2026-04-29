import { DubApiError } from "@/lib/api/errors";
import { ErrorCode, WebClient, type WebAPIPlatformError } from "@slack/web-api";

const INTERNAL_SUPPORT_USERGROUP_ID = "S0AJUBR8Y1Y";
const SLACK_SUPPORT_TIMEOUT_MS = 10_000;

function slackFailedWith(
  err: unknown,
  slackError: string,
): err is WebAPIPlatformError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: ErrorCode }).code === ErrorCode.PlatformError &&
    "data" in err &&
    (err as WebAPIPlatformError).data.error === slackError
  );
}

function getSupportSlack(): WebClient {
  const token = process.env.DUB_SLACK_ASSISTANT_BOT_TOKEN;
  if (!token) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Priority Slack support is not available right now.",
    });
  }
  return new WebClient(token, { timeout: SLACK_SUPPORT_TIMEOUT_MS });
}

async function inviteInternalSupportMembersToChannel({
  channelId,
}: {
  channelId: string;
}): Promise<void> {
  const slack = getSupportSlack();
  const listed = await slack.usergroups.users.list({
    usergroup: INTERNAL_SUPPORT_USERGROUP_ID,
  });
  // should never happen, but just in case
  if (!listed.users?.length) {
    console.warn("[slack] usergroups.users.list returned no users");
    return;
  }

  // should never get to 100+ users, but just in case
  const usersToInvite = listed.users.slice(0, 100);

  try {
    await slack.conversations.invite({
      channel: channelId,
      users: usersToInvite.join(","),
    });
    console.log(
      `[slack] invited ${usersToInvite.length} internal support members to channel ${channelId}`,
    );
  } catch (e) {
    if (slackFailedWith(e, "already_in_channel")) {
      console.log(
        `[slack] ${usersToInvite.length} internal support members already in channel ${channelId}`,
      );
      return;
    }
    throw e;
  }
}

export function sharedSupportChannelName({
  workspaceSlug,
}: {
  workspaceSlug: string;
}): string {
  const base = workspaceSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const safeBase = base.length > 0 ? base : "workspace";
  const prefixed = `shared-${safeBase}`;
  return prefixed.length <= 80 ? prefixed : prefixed.slice(0, 80);
}

async function createSharedCustomerChannel({
  workspaceSlug,
}: {
  workspaceSlug: string;
}): Promise<{ channelId: string } | { nameTaken: true }> {
  const name = sharedSupportChannelName({ workspaceSlug });
  const slack = getSupportSlack();

  try {
    const { channel } = await slack.conversations.create({
      name,
      is_private: false,
    });
    if (!channel?.id) {
      throw new DubApiError({
        code: "internal_server_error",
        message:
          "Could not prepare your Slack support channel. Please contact support for help connecting Slack.",
      });
    }
    return { channelId: channel.id };
  } catch (e) {
    if (slackFailedWith(e, "name_taken")) {
      console.warn("[slack] conversations.create name_taken", { name });
      return { nameTaken: true };
    }
    throw e;
  }
}

async function sendSlackConnectInvite({
  channelId,
  email,
}: {
  channelId: string;
  email: string;
}): Promise<string> {
  const slack = getSupportSlack();
  await inviteInternalSupportMembersToChannel({ channelId });

  const { invite_id: inviteId } = await slack.conversations.inviteShared({
    channel: channelId,
    emails: [email],
  });

  return inviteId!;
}

export async function requestSlackConnectSupportInvite({
  workspaceSlug,
  email,
}: {
  workspaceSlug: string;
  email: string;
}): Promise<{ inviteId: string }> {
  const result = await createSharedCustomerChannel({ workspaceSlug });

  if ("nameTaken" in result) {
    throw new DubApiError({
      code: "conflict",
      message:
        "Your workspace already has a Dub support channel. Ask your Slack admin to add you to it.",
    });
  }

  return {
    inviteId: await sendSlackConnectInvite({
      channelId: result.channelId,
      email,
    }),
  };
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
  if (!process.env.DUB_SLACK_ASSISTANT_BOT_TOKEN) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Priority Slack support is not available right now.",
    });
  }

  let resolvedChannelId = channelId;

  if (!resolvedChannelId) {
    const result = await createSharedCustomerChannel({ workspaceSlug });
    if ("nameTaken" in result) {
      return { nameTaken: true };
    }
    resolvedChannelId = result.channelId;
  }

  const inviteId = await sendSlackConnectInvite({
    channelId: resolvedChannelId,
    email,
  });

  return {
    inviteId,
  };
}
