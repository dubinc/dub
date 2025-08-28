"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  REJECT_BOUNTY_SUBMISSION_REASONS,
  rejectBountySubmissionSchema,
} from "@/lib/zod/schemas/bounties";
import { sendEmail } from "@dub/email";
import BountyRejected from "@dub/email/templates/bounty-rejected";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Reject a bounty submission
export const rejectBountySubmissionAction = authActionClient
  .schema(rejectBountySubmissionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId, rejectionReason, rejectionNote } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { program, bounty, partner, ...bountySubmission } =
      await prisma.bountySubmission.findUniqueOrThrow({
        where: {
          id: submissionId,
        },
        include: {
          program: true,
          bounty: true,
          partner: true,
        },
      });

    if (bountySubmission.programId !== programId) {
      throw new Error("Bounty submission does not belong to this program.");
    }

    if (bountySubmission.status === "rejected") {
      throw new Error("Bounty submission already rejected.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.bountySubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
          userId: user.id,
          rejectionReason,
          rejectionNote,
          commissionId: null,
        },
      });

      if (bountySubmission.commissionId) {
        await tx.commission.update({
          where: {
            id: bountySubmission.commissionId,
          },
          data: {
            status: "canceled",
            payoutId: null,
          },
        });
      }
    });

    if (partner.email) {
      waitUntil(
        sendEmail({
          subject: "Bounty rejected",
          email: partner.email,
          variant: "notifications",
          react: BountyRejected({
            email: partner.email,
            program: {
              name: program.name,
              slug: program.slug,
              supportEmail: program.supportEmail || "support@dub.co",
            },
            bounty: {
              name: bounty.name!,
            },
            submission: {
              rejectionReason:
                REJECT_BOUNTY_SUBMISSION_REASONS[rejectionReason],
            },
          }),
        }),
      );
    }

    // TODO:
    // Record audit log
  });
