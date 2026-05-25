import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { SLACK_SUPPORT_INVITE_MAX_EMAILS } from "@/lib/constants/misc";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { requestSlackConnectSupportInvite } from "@/lib/slack/support-invite";
import { ratelimit } from "@/lib/upstash";
import { isWorkspaceBillingTrialActive } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const slackSupportInviteBodySchema = z.object({
  emails: z.array(z.email()).min(1).max(SLACK_SUPPORT_INVITE_MAX_EMAILS),
});

function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter((e) => {
    if (seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}

// POST /api/workspaces/[idOrSlug]/support/slack-invite — Slack Connect invite to priority support
export const POST = withWorkspace(
  async ({ workspace, session, req }) => {
    if (!getPlanCapabilities(workspace.plan).canRequestSlackSupportInvite) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Priority Slack support is only available on Advanced and Enterprise plans. Upgrade your workspace to request access.",
      });
    }

    if (isWorkspaceBillingTrialActive(workspace.trialEndsAt)) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Priority Slack support is not available during a free trial. Activate your subscription to request access.",
      });
    }

    const body = await req.json().catch(() => ({}));
    const bodyEmails = (body as { emails?: unknown }).emails;
    const hasExplicitEmails =
      Array.isArray(bodyEmails) && bodyEmails.length > 0;

    let emails: string[];

    if (hasExplicitEmails) {
      const parsed = slackSupportInviteBodySchema.safeParse(body);
      if (!parsed.success) {
        throw new DubApiError({
          code: "bad_request",
          message:
            parsed.error.issues[0]?.message ??
            "Enter one or more valid email addresses.",
        });
      }
      emails = dedupeEmails(
        parsed.data.emails.map((e) => e.trim().toLowerCase()),
      );
    } else {
      const email = session.user.email?.trim().toLowerCase();
      if (!email) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Your account does not have an email address. Add one to request a Slack invite.",
        });
      }
      emails = [email];
    }

    const { success: workspaceSuccess } = await ratelimit(5, "1 d").limit(
      `slack-support-invite:workspace:${workspace.id}`,
    );

    if (!workspaceSuccess) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message:
          "This workspace has reached the daily limit for Slack invite requests. Please try again tomorrow.",
      });
    }

    const { success: userSuccess } = await ratelimit(10, "1 h").limit(
      `slack-support-invite:${workspace.id}:${session.user.id}`,
    );

    if (!userSuccess) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message:
          "You've requested too many Slack invites recently. Please try again later.",
      });
    }

    const { inviteIds } = await requestSlackConnectSupportInvite({
      workspaceSlug: workspace.slug,
      emails,
    });

    return NextResponse.json({ inviteIds });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["workspaces.write"],
  },
);
