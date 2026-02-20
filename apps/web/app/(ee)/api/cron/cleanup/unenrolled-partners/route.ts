import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkDeletePartners } from "@/lib/api/partners/bulk-delete-partners";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// This route is used to remove partners that are not enrolled in any program
// Runs once every day at 02:00:00 AM UTC (0 2 * * *)
// POST /api/cron/cleanup/unenrolled-partners
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    let deletedPartnersCount = 0;

    while (true) {
      const partnersToDelete = await prisma.partner.findMany({
        where: {
          stripeConnectId: null,
          programs: {
            none: {},
          },
          users: {
            none: {},
          },
        },
        take: 250,
      });

      if (partnersToDelete.length === 0) {
        console.log("No more partners to delete, skipping...");
        break;
      }

      console.log(`Found ${partnersToDelete.length} partners to delete.`);

      if (partnersToDelete.length > 0) {
        await bulkDeletePartners({
          partnerIds: partnersToDelete.map((partner) => partner.id),
          deletePartners: true,
        });
        deletedPartnersCount += partnersToDelete.length;
      }
    }

    return logAndRespond(
      `Deleted ${deletedPartnersCount} partners that were not enrolled in any programs.`,
    );
  } catch (error) {
    await log({
      message: `/api/cron/cleanup/unenrolled-partners failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
