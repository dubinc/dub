import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import PartnerApplicationRejected from "@dub/email/templates/partner-application-rejected";
import {
  ProgramApplicationRejectionReason,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { resolveFraudGroups } from "../../fraud/resolve-fraud-groups";
import { queuePartnerSearchSync } from "../queue-partner-search-sync";

export async function rejectPendingEnrollment({
  programId,
  partnerId,
  rejectionReason,
}: {
  programId: string;
  partnerId: string;
  rejectionReason: ProgramApplicationRejectionReason;
}): Promise<boolean> {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          slug: true,
          supportEmail: true,
        },
      },
    },
  });

  if (!programEnrollment) {
    return false;
  }

  if (programEnrollment.status !== ProgramEnrollmentStatus.pending) {
    return false;
  }

  const { skipped } = await prisma.$transaction(async (tx) => {
    const { count } = await tx.programEnrollment.updateMany({
      where: {
        id: programEnrollment.id,
        status: ProgramEnrollmentStatus.pending,
      },
      data: {
        status: ProgramEnrollmentStatus.rejected,
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        referralRewardId: null,
        customRewardId: null,
        discountId: null,
      },
    });

    if (count === 0) {
      return {
        skipped: true,
      };
    }

    if (programEnrollment.applicationId) {
      await tx.programApplication.update({
        where: {
          id: programEnrollment.applicationId,
        },
        data: {
          reviewedAt: new Date(),
          rejectionReason,
          rejectionNote: null,
        },
      });
    }

    return {
      skipped: false,
    };
  });

  if (skipped) {
    return false;
  }

  const { partner, program } = programEnrollment;

  await Promise.allSettled([
    resolveFraudGroups({
      where: {
        programId,
        partnerId,
      },
      resolutionReason:
        "Resolved automatically because the partner application was automatically rejected.",
    }),

    trackApplicationEvents({
      event: "rejected",
      programId,
      partnerIds: [partnerId],
    }),

    queuePartnerSearchSync({ enrollmentIds: [programEnrollment.id] }),

    partner.email &&
      sendEmail({
        to: partner.email,
        subject: `Your application to ${program.name} was not approved`,
        variant: "notifications",
        replyTo: program.supportEmail || "noreply",
        react: PartnerApplicationRejected({
          partner: {
            name: partner.name ?? "there",
            email: partner.email,
          },
          program: {
            name: program.name,
            slug: program.slug,
            supportEmail: program.supportEmail ?? undefined,
          },
        }),
      }),
  ]);

  return true;
}
