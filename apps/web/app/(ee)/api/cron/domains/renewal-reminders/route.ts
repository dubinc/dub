import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import DomainRenewalReminder from "@dub/email/templates/domain-renewal-reminder";
import { prisma } from "@dub/prisma";
import { chunk, log } from "@dub/utils";
import {
  differenceInCalendarDays,
  endOfDay,
  formatDistanceStrict,
  startOfDay,
  subDays,
} from "date-fns";
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

    console.log("targetDates", targetDates);

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
      console.log("No domains found to send reminders for. Skipping...");
      return NextResponse.json("No domains found to send reminders for.");
    }

    const reminderDomains = domains.flatMap(
      ({ slug, expiresAt, renewalFee, project }) => {
        const reminderWindow = differenceInCalendarDays(expiresAt, now);

        // we charge 14 days before the expiration date to ensure timely processing
        const chargeAt: Date = subDays(expiresAt, 14);

        return project.users.map(({ user }) => ({
          domain: {
            slug,
            renewalFee,
            expiresAt,
            reminderWindow,
            chargeAt,
            chargeAtInText: formatDistanceStrict(chargeAt, now),
          },
          workspace: {
            slug: project.slug,
          },
          user: {
            email: user.email,
          },
        }));
      },
    );

    console.table(reminderDomains);

    const reminderDomainsChunks = chunk(reminderDomains, 100);

    for (const reminderDomainsChunk of reminderDomainsChunks) {
      const res = await resend.batch.send(
        reminderDomainsChunk.map(({ workspace, user, domain }) => ({
          from: VARIANT_TO_FROM_MAP.notifications,
          to: user.email!,
          subject: "Your domain is expiring soon",
          variant: "notifications",
          react: DomainRenewalReminder({
            email: user.email!,
            workspace,
            domain,
          }),
        })),
      );
      console.log(`Sent ${reminderDomainsChunk.length} emails`, res);
    }

    return NextResponse.json(reminderDomains);
  } catch (error) {
    await log({
      message: "Domains renewal reminders cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
