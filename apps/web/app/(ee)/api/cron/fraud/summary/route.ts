import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { prisma } from "@/lib/prisma";
import type UnresolvedRiskEventsSummary from "@dub/email/templates/unresolved-risk-events-summary";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { format, startOfDay } from "date-fns";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const PROGRAMS_BATCH_SIZE = 10;

const schema = z.object({
  startingAfter: z.string().optional(),
});

// This route sends a daily summary of unresolved risk events to program owners
// Runs daily at 4:00 PM UTC
// GET/POST /api/cron/fraud/summary
export const GET = withCron(async ({ rawBody }) => {
  let { startingAfter } = schema.parse(rawBody ? JSON.parse(rawBody) : {});

  // Get batch of programs with unresolved risk events
  const programs = await prisma.program.findMany({
    where: {
      deactivatedAt: null,
      fraudEventGroups: {
        some: {
          status: "pending",
          lastEventAt: {
            gte: startOfDay(new Date()),
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      workspace: {
        select: {
          slug: true,
        },
      },
    },
    take: PROGRAMS_BATCH_SIZE,
    ...(startingAfter && {
      skip: 1,
      cursor: {
        id: startingAfter,
      },
    }),
    orderBy: {
      id: "asc",
    },
  });

  if (programs.length === 0) {
    return logAndRespond("No more programs found to send risk events summary.");
  }

  const batchDate = format(new Date(), "yyyy-MM-dd");

  for (const program of programs) {
    try {
      const fraudGroups = await prisma.fraudEventGroup.findMany({
        where: {
          programId: program.id,
          status: "pending",
          lastEventAt: {
            gte: startOfDay(new Date()),
          },
        },
        select: {
          id: true,
          type: true,
          eventCount: true,
          partner: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          lastEventAt: "desc",
        },
        take: 6,
      });

      if (fraudGroups.length === 0) {
        continue;
      }

      // Get workspace users to send the email to
      const { users } = await getWorkspaceUsers({
        role: "owner",
        programId: program.id,
        notificationPreference: "fraudEventsSummary",
      });

      if (users.length === 0) {
        continue;
      }

      const transformedFraudGroups = fraudGroups.map(
        ({ id, type, eventCount, partner }) => ({
          id,
          name: FRAUD_RULES_BY_TYPE[type].name,
          count: eventCount,
          partner,
        }),
      );

      await queueBatchEmail<typeof UnresolvedRiskEventsSummary>(
        users.map((user) => ({
          to: user.email,
          subject: `Risk events pending review for ${program.name}`,
          variant: "notifications",
          templateName: "UnresolvedRiskEventsSummary",
          templateProps: {
            email: user.email,
            workspace: program.workspace,
            program,
            fraudGroups: transformedFraudGroups,
          },
        })),
        {
          idempotencyKey: `fraud-events-summary/${program.id}/${batchDate}`,
        },
      );
    } catch (error) {
      console.error(
        `Error collecting email payloads for program ${program.id}: ${error.message}`,
      );
      continue;
    }
  }

  if (programs.length === PROGRAMS_BATCH_SIZE) {
    startingAfter = programs[programs.length - 1].id;

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/fraud/summary`,
      method: "POST",
      body: {
        startingAfter,
      },
    });

    return logAndRespond(
      `Scheduled next batch for fraud events summary (startingAfter: ${startingAfter})`,
    );
  }

  return logAndRespond("Finished sending fraud events summary.");
});

export const POST = GET;
