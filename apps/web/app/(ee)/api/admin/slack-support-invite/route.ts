import { withAdmin } from "@/lib/auth";
import {
  inviteToSlackSupportChannel,
  sharedSupportChannelName,
} from "@/lib/slack/support-invite";
import { NextResponse } from "next/server";

// POST /api/admin/slack-support-invite — manually send a Slack Connect invite on behalf of a workspace.
// Pass channelId when the channel already exists (name_taken) and you know the ID.
export const POST = withAdmin(async ({ req }) => {
  const { email, workspaceSlug, channelId } = await req.json();

  if (!email || !workspaceSlug) {
    return NextResponse.json(
      { error: "email and workspaceSlug are required" },
      { status: 400 },
    );
  }

  const { inviteId, nameTaken } = await inviteToSlackSupportChannel({
    email,
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

  return NextResponse.json({ success: true, inviteId });
});
