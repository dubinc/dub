import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to remove rejected programEnrollments from the database after 30 days so partners can re-apply
// Runs once every day at 02:00:00 AM UTC (0 2 * * *)
// POST /api/cron/cleanup/rejected-applications
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    // rejected programEnrollments more than 30 days ago
    const rejectedProgramEnrollments =
      await prisma.programEnrollment.deleteMany({
        where: {
          status: "rejected",
          updatedAt: {
            lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
          },
          commissions: {
            none: {}, // only delete if there are no commissions
          },
        },
      });

    console.log(
      `Deleted ${rejectedProgramEnrollments.count} rejected programEnrollments (older than 30 days)`,
    );

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    await log({
      message: `/api/cron/cleanup/rejected-applications failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
