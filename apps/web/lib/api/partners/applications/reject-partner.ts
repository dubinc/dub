import { getProgramApplicationRejectionReasonLabel } from "@/lib/partners/program-application-rejection";
import { WorkspaceProps } from "@/lib/types";
import { rejectPartnerSchema } from "@/lib/zod/schemas/partners";
import { sendEmail } from "@dub/email";
import PartnerApplicationRejected from "@dub/email/templates/partner-application-rejected";
import { prisma } from "@dub/prisma";
import { ProgramEnrollmentStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { trackActivityLog } from "../../activity-log/track-activity-log";
import { DubApiError } from "../../errors";
import { resolveFraudGroups } from "../../fraud/resolve-fraud-groups";
import { getDefaultProgramIdOrThrow } from "../../programs/get-default-program-id-or-throw";

type RejectPartnerInput = z.infer<typeof rejectPartnerSchema> & {
  userId: string;
  workspace: Pick<WorkspaceProps, "id" | "defaultProgramId">;
};

export async function rejectPartner({
  workspace,
  partnerId,
  rejectionReason,
  rejectionNote,
  allowImmediateReapply,
  userId,
}: RejectPartnerInput) {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      partner: true,
      program: {
        select: {
          name: true,
          slug: true,
          supportEmail: true,
        },
      },
    },
  });

  if (!programEnrollment) {
    throw new DubApiError({
      code: "not_found",
      message: "Program enrollment not found.",
    });
  }

  if (programEnrollment.status !== "pending") {
    throw new DubApiError({
      code: "bad_request",
      message:
        "This enrollment cannot be rejected because it is no longer pending.",
    });
  }

  await prisma.$transaction(async (tx) => {
    if (programEnrollment.applicationId) {
      await tx.programApplication.update({
        where: {
          id: programEnrollment.applicationId,
        },
        data: {
          reviewedAt: new Date(),
          rejectionReason,
          rejectionNote,
          userId,
        },
      });
    }

    // If the partner can immediately re-apply, delete the application
    if (allowImmediateReapply) {
      const { count } = await tx.programEnrollment.deleteMany({
        where: {
          id: programEnrollment.id,
          status: "pending",
        },
      });

      if (count !== 1) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "This enrollment cannot be deleted because it is no longer pending.",
        });
      }

      return;
    }

    // If the partner cannot immediately re-apply, reject the application
    await tx.programEnrollment.update({
      where: {
        id: programEnrollment.id,
        status: "pending",
      },
      data: {
        status: ProgramEnrollmentStatus.rejected,
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        discountId: null,
      },
    });
  });

  const { partner, program } = programEnrollment;

  waitUntil(
    Promise.allSettled([
      trackActivityLog({
        workspaceId: workspace.id,
        programId,
        resourceType: "partner",
        resourceId: partnerId,
        userId,
        action: "partner_application.rejected",
        changeSet: {
          status: {
            old: ProgramEnrollmentStatus.pending,
            new: ProgramEnrollmentStatus.rejected,
          },
        },
      }),

      resolveFraudGroups({
        where: {
          programId,
          partnerId,
        },
        userId,
        resolutionReason:
          "Resolved automatically because the partner application was rejected.",
      }),

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
              supportEmail: program.supportEmail,
            },
            additionalNotes: rejectionNote,
            rejectionReason:
              getProgramApplicationRejectionReasonLabel(rejectionReason),
            canReapplyImmediately: allowImmediateReapply,
          }),
        }),
    ]),
  );
}
