import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

/**
 * Cron to check if domains are verified.
 * If a domain is invalid for more than 14 days, we send a reminder email to the workspace owner.
 * If a domain is invalid for more than 28 days, we send a second and final reminder email to the workspace owner.
 * If a domain is invalid for more than 30 days, we delete it from the database.
 **/
// Runs every hour (0 * * * *)

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const domains = await prisma.registeredDomain.findMany({
      where: {
        autoRenewalDisabledAt: null,
        expiresAt: {
          lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      },
    });

    if (domains.length === 0) {
      return NextResponse.json("No domains found to send reminders for.");
    }

    // for (const domain of domains) {
    //   await sendDomainRenewalReminderEmail(domain);
    // }

    return NextResponse.json("OK");
  } catch (error) {
    await log({
      message: "Domains renewal cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
