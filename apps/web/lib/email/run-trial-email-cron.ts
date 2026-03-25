import {
  getDueTrialEmailTypes,
  getTrialEmailSubject,
} from "@/lib/email/trial-email-schedule";
import { renderTrialEmail } from "@/lib/email/render-trial-email";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { sendEmail as defaultSendEmail } from "@dub/email";
import type { PrismaClient } from "@dub/prisma/client";
import { APP_DOMAIN, log } from "@dub/utils";

export type RunTrialEmailCronResult = {
  sentCount: number;
  workspaceCount: number;
};

/** Only the Prisma methods this cron uses (easy to mock in tests). */
export type TrialEmailCronPrisma = {
  project: Pick<PrismaClient["project"], "findMany">;
  sentEmail: Pick<PrismaClient["sentEmail"], "create">;
};

export async function runTrialEmailCron({
  now,
  prisma,
  sendEmail = defaultSendEmail,
}: {
  now: Date;
  prisma: TrialEmailCronPrisma;
  sendEmail?: typeof defaultSendEmail;
}): Promise<RunTrialEmailCronResult> {
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

  return {
    sentCount,
    workspaceCount: workspaces.length,
  };
}
