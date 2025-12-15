import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkDeletePartners } from "@/lib/api/partners/bulk-delete-partners";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID, log } from "@dub/utils";
import { subHours } from "date-fns";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// This route is used to remove partners from the demo embed (acme.dub.sh)
// Runs every hour (0 * * * *)
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const programEnrollmentsToDelete = await prisma.programEnrollment.findMany({
      where: {
        programId: ACME_PROGRAM_ID,
        createdAt: {
          lt: subHours(new Date(), 1), // 1 hour ago
        },
        NOT: [
          {
            partner: {
              email: {
                endsWith: "@dub.co",
              },
            },
          },
          {
            partner: {
              email: {
                endsWith: "@dub-internal-test.com",
              },
            },
          },
          {
            partner: {
              email: {
                in: [
                  "panic@thedis.co",
                  "jasno@bourne.com",
                  "michael@scofield.com",
                  "steven@elegance.co",
                  "mailtokirankk@gmail.com",
                  "marcusljf@gmail.com",
                  "tim@twilson.net",
                ],
              },
            },
          },
        ],
      },
      orderBy: {
        totalCommissions: "desc",
      },
    });

    console.log(
      `Found ${programEnrollmentsToDelete.length} program enrollments to delete.`,
    );

    if (programEnrollmentsToDelete.length > 0) {
      await bulkDeletePartners({
        partnerIds: programEnrollmentsToDelete.map((pe) => pe.partnerId),
      });
    }

    return logAndRespond(
      `Removed ${programEnrollmentsToDelete.length} program enrollments from the demo embed.`,
    );
  } catch (error) {
    await log({
      message: `/api/cron/cleanup/demo-embed-partners failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
