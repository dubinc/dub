import { resolveFraudGroups } from "@/lib/api/fraud/resolve-fraud-groups";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { trackApplicationEvents } from "@/lib/application-events/update-application-event";
import {
  evaluateApplicationRequirements,
  getEligibilityContext,
} from "@/lib/partners/evaluate-application-requirements";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import PartnerApplicationRejected from "@dub/email/templates/partner-application-rejected";
import {
  ProgramApplicationRejectionReason,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// This job is used to auto-reject a partner enrollment (e.g. when eligibility requirements are not met)
export const autoRejectPartnerJob = defineJob({
  name: "auto-reject-partner-job",
  schema: inputSchema,
  async handle(input) {
    const { programId, partnerId } = input;

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
            description: true,
            monthlyTraffic: true,
            networkStatus: true,
            platforms: true,
            preferredEarningStructures: true,
            salesChannels: true,
            programs: {
              select: {
                status: true,
              },
            },
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
      console.warn(`Partner ${partnerId} not found in program ${programId}.`);
      return;
    }

    if (programEnrollment.status !== ProgramEnrollmentStatus.pending) {
      console.warn(`${partnerId} is in ${programEnrollment.status} status.`);
      return;
    }

    const result = evaluateApplicationRequirements({
      applicationRequirements:
        programEnrollment.program.applicationRequirements,
      context: getEligibilityContext({
        partner: programEnrollment.partner,
        programEnrollmentStatuses: programEnrollment.partner.programs.map(
          ({ status }) => status,
        ),
      }),
    });

    if (result.reason !== "requirementsNotMet") {
      console.warn(
        `Partner ${partnerId} now meets requirements for program ${programId} (reason: ${result.reason}).`,
      );
      return;
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
      console.warn(
        `Partner ${partnerId} is no longer pending in program ${programId}.`,
      );
      return;
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

      // Queue an index update because the enrollment status moved to rejected.
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

    console.info(
      `Successfully auto-rejected partner ${partnerId} in program ${programId}.`,
    );
  },
});
