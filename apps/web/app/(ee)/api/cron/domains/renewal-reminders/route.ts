import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { Project, RegisteredDomain, User } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { NextResponse } from "next/server";

/**
 * Daily cron job to send `.link` domain renewal reminders.
 *
 * Reminders are sent at the following intervals before the domain expiration date:
 *  - First reminder: 30 days prior
 *  - Second reminder: 23 days prior
 *  - Third reminder: 16 days prior
 */

export const dynamic = "force-dynamic";

const REMINDER_WINDOWS = [30, 23, 16];

interface GroupedWorkspace {
  workspace: Pick<Project, "id" | "slug"> & {
    users: Pick<User, "id" | "email">[];
  };
  domains: (Pick<
    RegisteredDomain,
    "id" | "slug" | "expiresAt" | "renewalFee"
  > & {
    daysLeft: number;
  })[];
}

// GET /api/cron/domains/renewal-reminders
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const now = new Date();

    const targetDates = REMINDER_WINDOWS.map((days) => {
      const date = subDays(now, -days);

      return {
        start: startOfDay(date),
        end: endOfDay(date),
        days,
      };
    });

    console.log(targetDates);

    // Find all domains that are eligible for renewal reminders
    const domains = await prisma.registeredDomain.findMany({
      where: {
        autoRenewalDisabledAt: null,
        OR: targetDates.map((t) => ({
          expiresAt: {
            gte: t.start,
            lte: t.end,
          },
        })),
      },
      include: {
        project: {
          include: {
            users: {
              where: {
                role: "owner",
              },
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (domains.length === 0) {
      return NextResponse.json("No domains found to send reminders for.");
    }

    // Group domains by workspaceId
    const groupedByWorkspace = domains.reduce(
      (acc, domain) => {
        const workspace = domain.project;

        if (!acc[workspace.id]) {
          acc[workspace.id] = {
            workspace: {
              id: workspace.id,
              slug: workspace.slug,
              users: workspace.users.map((user) => ({
                id: user.id,
                email: user.user.email,
              })),
            },
            domains: [],
          };
        }

        acc[workspace.id].domains.push({
          id: domain.id,
          slug: domain.slug,
          expiresAt: domain.expiresAt,
          renewalFee: domain.renewalFee,
          daysLeft: Math.ceil(
            (domain.expiresAt.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        });

        return acc;
      },
      {} as Record<string, GroupedWorkspace>,
    );

    // Send reminders to each workspace
    for (const workspaceId in groupedByWorkspace) {
      const { workspace, domains } = groupedByWorkspace[workspaceId];
    }

    return NextResponse.json(groupedByWorkspace);
  } catch (error) {
    await log({
      message: "Domains renewal reminders cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
