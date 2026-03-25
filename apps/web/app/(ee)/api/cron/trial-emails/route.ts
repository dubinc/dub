import { withCron } from "@/lib/cron/with-cron";
import {
  getDueTrialEmailTypes,
  getTrialEmailSubject,
  TRIAL_EMAIL_TYPE,
  type TrialEmailType,
} from "@/lib/email/trial-email-schedule";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { sendEmail } from "@dub/email";
import Trial3DaysRemainingEmail from "@dub/email/templates/trial-3-days-remaining";
import Trial7DaysRemainingEmail from "@dub/email/templates/trial-7-days-remaining";
import TrialEndsTodayEmail from "@dub/email/templates/trial-ends-today";
import TrialLinksFocusEmail from "@dub/email/templates/trial-links-focus";
import TrialPartnerFocusEmail from "@dub/email/templates/trial-partner-focus";
import TrialSocialProofEmail from "@dub/email/templates/trial-social-proof";
import TrialStartedEmail from "@dub/email/templates/trial-started";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN, log } from "@dub/utils";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

/**
 * Sends the paid-plan trial marketing sequence (see `lib/email/trial-email-schedule.ts`).
 * Runs on a schedule (cron). Eligibility is `trialEndsAt` in the future + `SentEmail` dedupe.
 *
 * Complements the generic welcome email (`/api/cron/welcome-user`): free-only signups get welcome only;
 * users who start a trial get welcome (QStash) + these emails when due.
 */
function renderTrialEmail(
  type: TrialEmailType,
  props: {
    email: string;
    name: string | null;
    unsubscribeUrl: string;
    plan: string;
    workspaceSlug: string;
  },
) {
  switch (type) {
    case TRIAL_EMAIL_TYPE.STARTED:
      return TrialStartedEmail(props);
    case TRIAL_EMAIL_TYPE.LINKS_FOCUS:
      return TrialLinksFocusEmail(props);
    case TRIAL_EMAIL_TYPE.PARTNER_FOCUS:
      return TrialPartnerFocusEmail(props);
    case TRIAL_EMAIL_TYPE.SOCIAL_PROOF:
      return TrialSocialProofEmail(props);
    case TRIAL_EMAIL_TYPE.SEVEN_DAYS_REMAINING:
      return Trial7DaysRemainingEmail(props);
    case TRIAL_EMAIL_TYPE.THREE_DAYS_REMAINING:
      return Trial3DaysRemainingEmail(props);
    case TRIAL_EMAIL_TYPE.ENDS_TODAY:
      return TrialEndsTodayEmail(props);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

// GET /api/cron/trial-emails
export const GET = withCron(async () => {
  const now = new Date();

  const workspaces = await prisma.project.findMany({
    where: {
      trialEndsAt: {
        gt: now,
      },
      plan: {
        not: "free",
      },
    },
    select: {
      id: true,
      slug: true,
      plan: true,
      sentEmails: {
        select: {
          type: true,
        },
      },
      trialEndsAt: true,
      users: {
        where: {
          role: "owner",
          user: {
            isMachine: false,
          },
        },
        select: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (workspaces.length === 0) {
    return logAndRespond("No workspaces in active trial. Skipping.");
  }

  let sentCount = 0;

  for (const workspace of workspaces) {
    const trialEndsAt = workspace.trialEndsAt;
    if (!trialEndsAt) {
      continue;
    }

    const owner = workspace.users[0]?.user;
    const email = owner?.email;
    if (!email) {
      continue;
    }

    const sent = new Set(workspace.sentEmails.map((s) => s.type));
    const due = getDueTrialEmailTypes({
      trialEndsAt,
      sent,
      now,
    });

    if (due.length === 0) {
      continue;
    }

    const unsubscribeUrl = `${APP_DOMAIN}/unsubscribe/${generateUnsubscribeToken(email)}`;
    const name = owner.name;

    for (const type of due) {
      try {
        await sendEmail({
          to: email,
          replyTo: "steven.tey@dub.co",
          subject: getTrialEmailSubject(type),
          react: renderTrialEmail(type, {
            email,
            name,
            unsubscribeUrl,
            plan: workspace.plan,
            workspaceSlug: workspace.slug,
          }),
          variant: "marketing",
        });

        await prisma.sentEmail.create({
          data: {
            projectId: workspace.id,
            type,
          },
        });
        sentCount++;
      } catch (error) {
        await log({
          message: `Failed to send trial email *${type}* for workspace ${workspace.id}: ${error instanceof Error ? error.message : String(error)}`,
          type: "errors",
        });
      }
    }
  }

  return logAndRespond(
    `Trial email cron completed. Sent ${sentCount} email(s) across ${workspaces.length} workspace(s).`,
  );
});
