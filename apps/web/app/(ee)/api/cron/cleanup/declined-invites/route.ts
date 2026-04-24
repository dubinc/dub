import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { subDays } from "date-fns";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Removes declined programEnrollments after 90 days so partners can be re-invited
// Runs once every day at 03:00:00 AM UTC (0 3 * * *)
// POST /api/cron/cleanup/declined-invites
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    while (true) {
      // declined programEnrollments more than 90 days ago
      const declinedProgramEnrollments =
        await prisma.programEnrollment.findMany({
          where: {
            status: "declined",
            updatedAt: {
              lt: subDays(new Date(), 90),
            },
            // only delete if there are no messages (e.g. prior network messages)
            messages: {
              none: {},
            },
          },
          take: 250,
        });

      if (declinedProgramEnrollments.length === 0) {
        console.log(
          "No more declined programEnrollments to delete, skipping...",
        );
        break;
      }

      const deletedRes = await prisma.programEnrollment.deleteMany({
        where: {
          id: {
            in: declinedProgramEnrollments.map(({ id }) => id),
          },
        },
      });

      console.log(
        `Deleted ${deletedRes.count} declined programEnrollments that are older than 90 days`,
      );
    }

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    await log({
      message: `/api/cron/cleanup/declined-invites failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
