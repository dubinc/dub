import { renderTrialEmail } from "@/lib/email/render-trial-email";
import {
  getDueTrialEmailTypes,
  getTrialEmailSubject,
} from "@/lib/email/trial-email-schedule";
import { sendBatchEmail as defaultSendBatchEmail } from "@dub/email";
import type { PrismaClient } from "@dub/prisma/client";
import { chunk, log } from "@dub/utils";
import { createHash } from "crypto";

const CRON_BATCH_SIZE = 50;
const EMAIL_BATCH_SIZE = 100;

export type RunTrialEmailCronResult = {
  sentCount: number;
  workspaceCount: number;
  hasMore: boolean;
  nextStartingAfter?: string;
};

/** Only the Prisma methods this cron uses (easy to mock in tests). */
export type TrialEmailCronPrisma = {
  project: Pick<PrismaClient["project"], "findMany">;
  sentEmail: Pick<PrismaClient["sentEmail"], "create">;
};

type SendBatchEmail = typeof defaultSendBatchEmail;

function dedupeRecipients(
  users: { user: { email: string | null; name: string | null } }[],
): { email: string; name: string | null }[] {
  const byEmail = new Map<string, { email: string; name: string | null }>();

  for (const { user } of users) {
    if (!user.email) {
      continue;
    }

    const key = user.email.toLowerCase();
    if (!byEmail.has(key)) {
      byEmail.set(key, { email: user.email, name: user.name });
    }
  }

  return [...byEmail.values()].sort((a, b) =>
    a.email.toLowerCase().localeCompare(b.email.toLowerCase()),
  );
}

export async function runTrialEmailCron({
  now,
  prisma,
  startingAfter,
  sendBatchEmail = defaultSendBatchEmail,
}: {
  now: Date;
  prisma: TrialEmailCronPrisma;
  startingAfter?: string;
  sendBatchEmail?: SendBatchEmail;
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
    take: CRON_BATCH_SIZE,
    skip: startingAfter ? 1 : 0,
    ...(startingAfter && {
      cursor: {
        id: startingAfter,
      },
    }),
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      trialEndsAt: true,
      programs: {
        select: {
          name: true,
        },
      },
      sentEmails: {
        select: {
          type: true,
        },
      },
      users: {
        where: {
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
      },
    },
  });

  const hasMore = workspaces.length === CRON_BATCH_SIZE;
  const nextStartingAfter = hasMore
    ? workspaces[workspaces.length - 1]?.id
    : undefined;

  let sentCount = 0;

  for (const workspace of workspaces) {
    const trialEndsAt = workspace.trialEndsAt;
    if (!trialEndsAt) {
      continue;
    }

    const recipients = dedupeRecipients(workspace.users);
    if (recipients.length === 0) {
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

    for (const type of due) {
      const payloads = recipients.map((recipient) => ({
        to: recipient.email,
        replyTo: "steven.tey@dub.co",
        subject: getTrialEmailSubject({
          type,
          companyName: workspace.programs?.[0]?.name ?? workspace.name,
        }),
        react: renderTrialEmail(type, {
          email: recipient.email,
          name: recipient.name,
          plan: workspace.plan,
          workspaceSlug: workspace.slug,
        }),
        variant: "marketing" as const,
      }));

      let groupFailed = false;
      const batches = chunk(payloads, EMAIL_BATCH_SIZE);
      for (const batch of batches) {
        const batchKey = createHash("sha256")
          .update(
            batch
              .map(({ to }) => to.toLowerCase())
              .sort()
              .join(","),
          )
          .digest("hex");
        const idempotencyKey = `trial-emails/${workspace.id}/${type}/${batchKey}`;

        try {
          const { error } = await sendBatchEmail(batch, { idempotencyKey });
          if (error) {
            groupFailed = true;
            await log({
              message: `Failed to send trial email batch *${type}* for workspace ${workspace.id}: ${String(error)}`,
              type: "errors",
            });
            break;
          }
        } catch (error) {
          groupFailed = true;
          await log({
            message: `Failed to send trial email batch *${type}* for workspace ${workspace.id}: ${error instanceof Error ? error.message : String(error)}`,
            type: "errors",
          });
          break;
        }
      }

      if (!groupFailed) {
        try {
          await prisma.sentEmail.create({
            data: {
              projectId: workspace.id,
              type,
            },
          });
          sentCount += payloads.length;
        } catch (error) {
          await log({
            message: `Failed to record SentEmail for *${type}* workspace ${workspace.id}: ${error instanceof Error ? error.message : String(error)}`,
            type: "errors",
          });
        }
      }
    }
  }

  return {
    sentCount,
    workspaceCount: workspaces.length,
    hasMore,
    ...(nextStartingAfter ? { nextStartingAfter } : {}),
  };
}
