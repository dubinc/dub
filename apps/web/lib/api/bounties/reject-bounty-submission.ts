import { Session } from "@/lib/auth";
import { REJECT_BOUNTY_SUBMISSION_REASONS } from "@/lib/constants/bounties";
import {
  BountySubmissionSchema,
  rejectBountySubmissionBodySchema,
} from "@/lib/zod/schemas/bounties";
import { sendEmail } from "@dub/email";
import BountyRejected from "@dub/email/templates/bounty-rejected";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { recordAuditLog } from "../audit-logs/record-audit-log";
import { DubApiError } from "../errors";

interface RejectBountySubmissionParams
  extends z.infer<typeof rejectBountySubmissionBodySchema> {
  bountyId?: string;
  programId: string;
  submissionId: string;
  user: Session["user"];
}

export async function rejectBountySubmission({
  programId,
  bountyId,
  submissionId,
  rejectionReason = "other",
  rejectionNote,
  user,
}: RejectBountySubmissionParams) {
  const submission = await prisma.bountySubmission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      programId: true,
      bountyId: true,
      status: true,
      bounty: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!submission) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty submission ${submissionId} not found.`,
    });
  }

  if (submission.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty submission ${submissionId} does not belong to program ${programId}.`,
    });
  }

  if (bountyId && submission.bountyId !== bountyId) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty submission ${submissionId} not found for bounty ${bountyId}.`,
    });
  }

  if (submission.status === "draft") {
    throw new DubApiError({
      code: "bad_request",
      message: "This bounty submission is in progress and cannot be rejected.",
    });
  }

  if (submission.status === "rejected") {
    throw new DubApiError({
      code: "bad_request",
      message: "This bounty submission has already been rejected.",
    });
  }

  if (submission.status === "approved") {
    throw new DubApiError({
      code: "bad_request",
      message:
        "This bounty submission has already been approved and cannot be rejected.",
    });
  }

  const bounty = submission.bounty;

  const rejectedSubmission = await prisma.bountySubmission.update({
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
    include: {
      partner: {
        select: {
          id: true,
          email: true,
        },
      },
      program: {
        select: {
          workspaceId: true,
          id: true,
          name: true,
          slug: true,
          supportEmail: true,
        },
      },
    },
  });

  const { program, partner } = rejectedSubmission;

  waitUntil(
    Promise.allSettled([
      recordAuditLog({
        workspaceId: program.workspaceId,
        programId: program.id,
        action: "bounty_submission.rejected",
        description: `Bounty submission rejected for ${partner.id}`,
        actor: user,
        targets: [
          {
            type: "bounty_submission",
            id: submissionId,
            metadata: BountySubmissionSchema.parse(rejectedSubmission),
          },
        ],
      }),

      partner.email &&
        sendEmail({
          subject: "Bounty rejected",
          to: partner.email,
          variant: "notifications",
          replyTo: program.supportEmail || "noreply",
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

  return BountySubmissionSchema.parse(rejectedSubmission);
}
