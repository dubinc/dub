import { queueDiscountCodeDeletion } from "@/lib/api/discounts/queue-discount-code-deletion";
import { createFraudEvents } from "@/lib/api/fraud/create-fraud-events";
import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withCron } from "@/lib/cron/with-cron";
import { recordLink } from "@/lib/tinybird";
import {
  BAN_PARTNER_REASONS,
  INACTIVE_ENROLLMENT_STATUSES,
} from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerBanned from "@dub/email/templates/partner-banned";
import { prisma } from "@dub/prisma";
import { FraudRuleType } from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../../utils";
import { cancelCommissions } from "./cancel-commissions";

const schema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// POST /api/cron/partners/ban/process - do the post-ban processing
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerId } = schema.parse(JSON.parse(rawBody));

  console.info(`Banning partner ${partnerId} from program ${programId}...`);

  const { partner, links, ...programEnrollment } =
    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        partner: true,
        links: {
          include: {
            ...includeTags,
            discountCode: true,
          },
        },
      },
    });

  if (programEnrollment.status !== "banned") {
    return logAndRespond(
      `Partner ${programEnrollment.partnerId} is not banned from program ${programEnrollment.programId}.`,
    );
  }

  const commonWhere = {
    programId,
    partnerId,
  };

  const [linksUpdated, bountySubmissions, discountCodes, payouts] =
    await prisma.$transaction([
      // Disable links
      prisma.link.updateMany({
        where: {
          ...commonWhere,
        },
        data: {
          disabledAt: new Date(),
          expiresAt: new Date(),
        },
      }),

      // Reject bounty submissions
      prisma.bountySubmission.updateMany({
        where: {
          ...commonWhere,
          status: {
            not: "approved",
          },
        },
        data: {
          status: "rejected",
        },
      }),

      // Remove discount codes
      prisma.discountCode.updateMany({
        where: {
          ...commonWhere,
        },
        data: {
          discountId: null,
        },
      }),

      // Cancel payouts
      prisma.payout.updateMany({
        where: {
          ...commonWhere,
          status: "pending",
        },
        data: {
          status: "canceled",
        },
      }),
    ]);

  console.info(`Disabled ${linksUpdated.count} links.`);
  console.info(`Rejected ${bountySubmissions.count} bounty submissions.`);
  console.info(`Removed ${discountCodes.count} discount codes.`);
  console.info(`Cancelled ${payouts.count} payouts.`);

  // Mark the commissions as cancelled
  await cancelCommissions({
    programId,
    partnerId,
  });

  await Promise.all([
    // Sync total commissions
    syncTotalCommissions({
      programId,
      partnerId,
    }),

    // Expire links from cache
    linkCache.expireMany(links),

    // Delete links from Tinybird links metadata
    recordLink(links, { deleted: true }),

    // Queue discount code deletions
    queueDiscountCodeDeletion(
      links
        .map((link) => link.discountCode?.id)
        .filter((id): id is string => id !== undefined),
    ),
  ]);

  const affectedProgramEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId,
      programId: {
        not: programId,
      },
      status: {
        notIn: INACTIVE_ENROLLMENT_STATUSES,
      },
    },
    select: {
      programId: true,
      partnerId: true,
    },
  });

  // Create partnerCrossProgramBan fraud events for all active enrollments
  // to flag potential cross-program fraud risk
  await createFraudEvents(
    affectedProgramEnrollments.map((affectedEnrollment) => ({
      programId: affectedEnrollment.programId,
      partnerId: affectedEnrollment.partnerId,
      type: FraudRuleType.partnerCrossProgramBan,
      sourceProgramId: programEnrollment.programId, // The program that issued the ban
      metadata: {
        bannedReason: programEnrollment.bannedReason,
        bannedAt: programEnrollment.bannedAt,
      },
    })),
  );

  // Send email
  if (partner.email) {
    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        name: true,
        slug: true,
        supportEmail: true,
      },
    });

    try {
      await sendEmail({
        to: partner.email,
        subject: `You've been banned from the ${program.name} Partner Program`,
        variant: "notifications",
        replyTo: program.supportEmail || "noreply",
        react: PartnerBanned({
          partner: {
            name: partner.name,
            email: partner.email,
          },
          program: {
            name: program.name,
            slug: program.slug,
          },
          // A reason is always present because we validate the schema
          bannedReason: programEnrollment.bannedReason
            ? BAN_PARTNER_REASONS[programEnrollment.bannedReason!]
            : "",
        }),
      });
    } catch {}
  }

  return logAndRespond(
    `Partner ${partnerId} banned from the program ${programId}.`,
  );
});
