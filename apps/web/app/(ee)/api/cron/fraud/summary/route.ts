import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { getGroupedFraudEvents } from "@/lib/api/fraud/get-grouped-fraud-events";
import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import type UnresolvedFraudEventsSummary from "@dub/email/templates/unresolved-fraud-events-summary";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { format, startOfDay } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const PROGRAMS_BATCH_SIZE = 5;

const schema = z.object({
  startingAfter: z.string().optional(),
});

async function handler(req: Request) {
  try {
    let { startingAfter } = schema.parse({});

    if (req.method === "GET") {
      await verifyVercelSignature(req);
    } else if (req.method === "POST") {
      const rawBody = await req.text();
      await verifyQstashSignature({
        req,
        rawBody,
      });

      ({ startingAfter } = schema.parse(JSON.parse(rawBody)));
    }

    // Get batch of programs with unresolved fraud events
    const programs = await prisma.program.findMany({
      where: {
        fraudEvents: {
          some: {
            status: "pending",
            // Only include programs with fraud events created today so daily summaries
            createdAt: {
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
      return logAndRespond(
        "No more programs found to send fraud events summary.",
      );
    }

    const batchDate = format(new Date(), "yyyy-MM-dd");

    for (const program of programs) {
      try {
        const fraudEvents = await getGroupedFraudEvents({
          programId: program.id,
          status: "pending",
          page: 1,
          pageSize: 6,
          sortBy: "createdAt",
          sortOrder: "asc",
        });

        if (fraudEvents.length === 0) {
          continue;
        }

        const transformedFraudEvents = fraudEvents.map(
          ({ type, count, groupKey, partner }) => ({
            name: FRAUD_RULES_BY_TYPE[type].name,
            count,
            groupKey,
            partner,
          }),
        );

        // Get workspace users to send the email to
        const { users } = await getWorkspaceUsers({
          role: "owner",
          programId: program.id,
          notificationPreference: "fraudEventsSummary",
        });

        if (users.length === 0) {
          continue;
        }

        await queueBatchEmail<typeof UnresolvedFraudEventsSummary>(
          users.map((user) => ({
            to: user.email,
            subject: `Fraud events pending review for ${program.name}`,
            variant: "notifications",
            templateName: "UnresolvedFraudEventsSummary",
            templateProps: {
              email: user.email,
              workspace: program.workspace,
              program,
              fraudEvents: transformedFraudEvents,
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
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

// GET/POST /api/cron/fraud/summary
export { handler as GET, handler as POST };
