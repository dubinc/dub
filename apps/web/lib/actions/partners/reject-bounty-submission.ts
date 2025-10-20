"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  BountySubmissionSchema,
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

    if (bountySubmission.status === "draft") {
      throw new Error(
        "Bounty submission is in progress and cannot be rejected.",
      );
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

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId: program.id,
          action: "bounty_submission.rejected",
          description: `Bounty submission rejected for ${partner.id}`,
          actor: user,
          targets: [
            {
              type: "bounty_submission",
              id: submissionId,
              metadata: BountySubmissionSchema.parse(bountySubmission),
            },
          ],
        }),
        partner.email &&
          sendEmail({
            subject: "Bounty rejected",
            to: partner.email,
            variant: "notifications",
            ...(program.supportEmail ? { replyTo: program.supportEmail } : {}),
            react: BountyRejected({
              email: partner.email,
              program: {
                name: program.name,
                slug: program.slug,
              },
              bounty: {
                name: bounty.name,
              },
              submission: {
                rejectionReason:
                  REJECT_BOUNTY_SUBMISSION_REASONS[rejectionReason],
                rejectionNote,
              },
            }),
          }),
      ]),
    );
  });
