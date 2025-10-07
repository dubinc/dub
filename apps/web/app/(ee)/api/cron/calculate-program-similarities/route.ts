import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import {
  ACME_PROGRAM_ID,
  APP_DOMAIN_WITH_NGROK,
  isFulfilled,
  isRejected,
} from "@dub/utils";
import { NextRequest } from "next/server";
import { logAndRespond } from "../utils";

const queue = qstash.queue({
  queueName: "calculate-program-similarities",
});

// GET /api/cron/calculate-program-similarities
// Dispatch individual similarity calculation jobs for each program using sorted processing to prevent duplicates
export async function GET(req: NextRequest) {
  try {
    await verifyVercelSignature(req);

    await queue.upsert({
      parallelism: 10,
    });

    const programs = await prisma.program.findMany({
      where: {
        id: {
          not: ACME_PROGRAM_ID,
        },
        // categories: {
        //   some: {},
        // },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc", // deterministic ordering for duplicate prevention
      },
    });

    const queueResults = await Promise.allSettled(
      programs.map((program) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/calculate-program-similarities/${program.id}`,
        }),
      ),
    );

    const successful = queueResults.filter(isFulfilled).length;
    const failed = queueResults.filter(isRejected).length;

    return logAndRespond(
      `Queued program similarity jobs (failed: ${failed}, successful: ${successful}).`,
    );
  } catch (error) {
    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
