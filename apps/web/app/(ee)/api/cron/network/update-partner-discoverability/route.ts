import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { EXCLUDED_PROGRAM_IDS } from "@/lib/constants/partner-profile";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { log, prettyPrint } from "@dub/utils";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// This route is used to update the discoverability of partners in the network
// Runs once every hour (0 * * * *)
// POST /api/cron/network/update-partner-discoverability
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const eligiblePartners = await prisma.partner.findMany({
      where: {
        programs: {
          some: {
            programId: {
              notIn: EXCLUDED_PROGRAM_IDS,
            },
            status: "approved",
            totalCommissions: {
              gte: 10_00,
            },
          },
          none: {
            status: "banned",
          },
        },
      },
    });

    const discoveredRes = await prisma.partner.updateMany({
      where: {
        discoverableAt: null,
        id: {
          in: eligiblePartners.map((partner) => partner.id),
        },
      },
      data: { discoverableAt: new Date() },
    });
    console.log(`Updated ${discoveredRes.count} partners to be discoverable`);

    const notDiscoveredRes = await prisma.partner.updateMany({
      where: {
        discoverableAt: {
          not: null,
        },
        id: {
          notIn: eligiblePartners.map((partner) => partner.id),
        },
      },
      data: { discoverableAt: null },
    });

    console.log(
      `Updated ${notDiscoveredRes.count} partners to be not discoverable`,
    );

    return logAndRespond(
      prettyPrint({
        discoverable: discoveredRes.count,
        notDiscoverable: notDiscoveredRes.count,
      }),
    );
  } catch (error) {
    await log({
      message: `/api/cron/network/update-partner-discoverability failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
