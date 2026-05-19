import { withAdmin } from "@/lib/auth";
import {
  inviteToSlackSupportChannel,
  sharedSupportChannelName,
} from "@/lib/slack/support-invite";
import { NextResponse } from "next/server";

// POST /api/admin/slack-support-invite — manually send a Slack Connect invite on behalf of a workspace.
// Pass channelId when the channel already exists (name_taken) and you know the ID.
export const POST = withAdmin(async ({ req }) => {
  const {
    email,
    emails: emailsBody,
    workspaceSlug,
    channelId,
  } = await req.json();

  const emails =
    Array.isArray(emailsBody) && emailsBody.length > 0
      ? emailsBody
      : typeof email === "string" && email.trim()
        ? [email.trim()]
        : [];

  if (emails.length === 0 || !workspaceSlug) {
    return NextResponse.json(
      { error: "email (or emails) and workspaceSlug are required" },
      { status: 400 },
    );
  }

  const { inviteIds, nameTaken } = await inviteToSlackSupportChannel({
    emails,
    workspaceSlug,
    channelId: channelId || undefined,
  });

  if (nameTaken) {
    return NextResponse.json(
      {
        error: `Channel #${sharedSupportChannelName(workspaceSlug)} already exists. Provide its Slack channel ID (C…) to send the invite.`,
        nameTaken: true,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true, inviteIds });
});
