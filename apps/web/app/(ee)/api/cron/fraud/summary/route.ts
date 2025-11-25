import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { getGroupedFraudEvents } from "@/lib/api/fraud/get-grouped-fraud-events";
import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { fraudEventGroupProps, FraudRuleInfo, ProgramProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

type FraudEventPayload = Pick<
  fraudEventGroupProps,
  "count" | "groupKey" | "partner"
> & {
  typeInfo: Pick<FraudRuleInfo, "name">;
};

interface EmailPayload {
  program: Pick<ProgramProps, "id" | "name" | "slug">;
  fraudEvents: FraudEventPayload[];
}

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
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
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

    // Collect email payloads for this batch of programs
    const emailPayloads: EmailPayload[] = [];

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

        emailPayloads.push({
          program,
          fraudEvents: fraudEvents.map(
            ({ type, count, groupKey, partner }) => ({
              count,
              groupKey,
              partner,
              typeInfo: FRAUD_RULES_BY_TYPE[type],
            }),
          ),
        });

        // Get workspace users to send the email to
        const { users } = await getWorkspaceUsers({
          role: "owner",
          programId: program.id,
          notificationPreference: "fraudEventsSummary",
        });
      } catch (error) {
        console.error(
          `Error collecting email payloads for program ${program.id}: ${error.message}`,
        );
        continue;
      }
    }

    return logAndRespond("Finished sending fraud events summary.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}

// GET/POST /api/cron/fraud/summary
export { handler as GET, handler as POST };
