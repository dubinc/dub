import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { limiter } from "@/lib/cron/limiter";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { getPartnerActivities } from "@/lib/tinybird/get-partner-activities";
import { sendEmail } from "@dub/email";
import { PartnerActivitySummary } from "@dub/email/templates/partner-activity-summary";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This route is used to send summary of partner activities to program owners
// Runs every week at 7AM PST
// GET /api/cron/partners/activity-summary
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const programs = await prisma.program.findMany({
      select: {
        id: true,
        name: true,
        logo: true,
        workspaceId: true,
      },
    });

    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    for (const program of programs) {
      const activities = await getPartnerActivities({
        programId: program.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const parsedActivities = activities.data.map((event) => event);

      if (!parsedActivities || !parsedActivities.length) {
        continue;
      }

      const partners = await prisma.partner.findMany({
        where: {
          id: {
            in: parsedActivities.map((activity) => activity.partner_id),
          },
        },
        select: {
          id: true,
          name: true,
          image: true,
        },
      });

      const partnerMap = partners.reduce(
        (acc, partner) => {
          acc[partner.id] = partner;
          return acc;
        },
        {} as Record<string, any>,
      );

      const programOwners = await prisma.projectUsers.findMany({
        where: {
          projectId: program.workspaceId,
          role: "owner",
        },
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      await Promise.all(
        programOwners.map(({ user }) =>
          limiter.schedule(() =>
            sendEmail({
              subject: `Partner activity summary for ${program.name}`,
              email: user.email!,
              react: PartnerActivitySummary({
                email: user.email!,
                startDate,
                endDate,
                program: {
                  id: program.id,
                  name: program.name,
                  logo: program.logo,
                },
                activities: parsedActivities.map((activity) => ({
                  partner: partnerMap[activity.partner_id],
                  link: activity.url,
                  reason: activity.activity,
                })),
              }),
              variant: "notifications",
            }),
          ),
        ),
      );
    }

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
