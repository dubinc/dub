"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { BountySubmissionSchema } from "@/lib/zod/schemas/bounties";
// Email notification can be added later if needed
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  submissionId: z.string(),
});

// Reopen a bounty submission that was previously submitted
export const reopenBountySubmissionAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId } = parsedInput;

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
          commission: true,
        },
      });

    if (bountySubmission.programId !== programId) {
      throw new Error("Bounty submission does not belong to this program.");
    }

    if (bountySubmission.status !== "submitted") {
      throw new Error("Bounty submission is not submitted yet.");
    }

    await prisma.bountySubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "draft",
      },
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId: program.id,
          action: "bounty_submission.reopened",
          description: `Bounty submission reopened for ${partner.id}`,
          actor: user,
          targets: [
            {
              type: "bounty_submission",
              id: submissionId,
              metadata: BountySubmissionSchema.parse(bountySubmission),
            },
          ],
        }),

        // Email notification can be added later if needed
        Promise.resolve(),
      ]),
    );
  });
