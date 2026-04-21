import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { requestSlackConnectSupportInvite } from "@/lib/slack/support-invite";
import { ratelimit } from "@/lib/upstash";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/support/slack-invite — Slack Connect invite to priority support
export const POST = withWorkspace(
  async ({ workspace, session }) => {
    if (!getPlanCapabilities(workspace.plan).canRequestSlackSupportInvite) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Priority Slack support is only available on Advanced and Enterprise plans. Upgrade your workspace to request access.",
      });
    }

    const email = session.user.email?.trim();
    if (!email) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Your account does not have an email address. Add one to request a Slack invite.",
      });
    }

    const { success } = await ratelimit(10, "1 h").limit(
      `slack-support-invite:${workspace.id}:${session.user.id}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message:
          "You've requested too many Slack invites recently. Please try again later.",
      });
    }

    const { inviteId } = await requestSlackConnectSupportInvite({
      email,
      workspaceSlug: workspace.slug,
    });

    return NextResponse.json({ inviteId });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
