import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withCron } from "@/lib/cron/with-cron";
import { disableDiscountCodes } from "@/lib/discounts/disable-discount-codes";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { BAN_PARTNER_REASONS } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerBanned from "@dub/email/templates/partner-banned";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
import { cancelCommissions } from "./cancel-commissions";

const schema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// POST /api/cron/partners/ban - handle all side effects of banning a partner
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerId } = schema.parse(JSON.parse(rawBody));

  console.info(`Banning partner ${partnerId} from program ${programId}...`);

  const { partner, links, program, ...programEnrollment } =
    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        partner: true,
        links: {
          include: includeTags,
        },
        program: {
          select: {
            workspaceId: true,
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

  const [linksUpdated, bountySubmissions, payouts, discountCodesDisabled] =
    await prisma.$transaction(async (tx) => {
      const linksUpdated = await tx.link.updateMany({
        where: {
          ...commonWhere,
        },
        data: {
          disabledAt: new Date(),
          expiresAt: new Date(),
        },
      });

      const bountySubmissions = await tx.bountySubmission.updateMany({
        where: {
          ...commonWhere,
          status: {
            not: "approved",
          },
        },
        data: {
          status: "rejected",
          rejectionReason: "other",
          rejectionNote:
            "Rejected automatically because the partner was banned.",
        },
      });

      const payouts = await tx.payout.updateMany({
        where: {
          ...commonWhere,
          status: "pending",
        },
        data: {
          status: "canceled",
        },
      });

      const discountCodesDisabled = await disableDiscountCodes({
        where: {
          ...commonWhere,
        },
        tx,
      });

      return [
        linksUpdated,
        bountySubmissions,
        payouts,
        discountCodesDisabled,
      ] as const;
    });

  console.info(`Disabled ${linksUpdated.count} links.`);
  console.info(`Rejected ${bountySubmissions.count} bounty submissions.`);
  console.info(`Canceled ${payouts.count} payouts.`);
  console.info(`Disabled ${discountCodesDisabled} discount codes.`);

  // Mark the commissions as canceled
  await cancelCommissions({
    workspaceId: program.workspaceId,
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
  ]);

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
