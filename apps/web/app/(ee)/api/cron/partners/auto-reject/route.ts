import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { withCron } from "@/lib/cron/with-cron";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { sendEmail } from "@dub/email";
import PartnerApplicationRejected from "@dub/email/templates/partner-application-rejected";
import { prisma } from "@dub/prisma";
import {
  ProgramApplicationRejectionReason,
  ProgramEnrollmentStatus,
} from "@dub/prisma/client";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// POST /api/cron/partners/auto-reject
// This route is used to auto-reject a partner enrollment (e.g. when eligibility requirements are not met)
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerId } = inputSchema.parse(JSON.parse(rawBody));

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
          country: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          slug: true,
          supportEmail: true,
          applicationRequirements: true,
        },
      },
    },
  });

  if (!programEnrollment) {
    return logAndRespond(
      `Partner ${partnerId} not found in program ${programId}. Skipping auto-reject.`,
    );
  }

  if (programEnrollment.status !== "pending") {
    return logAndRespond(
      `Partner ${partnerId} is in ${programEnrollment.status} status. Skipping auto-reject.`,
    );
  }

  const result = evaluateApplicationRequirements({
    applicationRequirements: programEnrollment.program.applicationRequirements,
    context: {
      country: programEnrollment.partner.country,
      email: programEnrollment.partner.email,
    },
  });

  if (result.reason !== "requirementsNotMet") {
    return logAndRespond(
      `Partner ${partnerId} now meets requirements for program ${programId} (reason: ${result.reason}). Skipping auto-reject.`,
    );
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
          rejectionReason:
            ProgramApplicationRejectionReason.doesNotMeetRequirements,
          rejectionNote: null,
        },
      });
    }

    return {
      skipped: false,
    };
  });

  if (skipped) {
    return logAndRespond(
      `Partner ${partnerId} is no longer pending in program ${programId}. Skipping auto-reject.`,
    );
  }

  await resolveFraudGroups({
    where: {
      programId,
      partnerId,
    },
    resolutionReason:
      "Resolved automatically because the partner application was automatically rejected.",
  });

  const { partner, program } = programEnrollment;

  if (partner.email) {
    await sendEmail({
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
    });
  }

  return logAndRespond(
    `Successfully auto-rejected partner ${partnerId} in program ${programId}.`,
  );
});
