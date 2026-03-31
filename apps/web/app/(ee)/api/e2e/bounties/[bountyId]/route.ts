import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../../guard";

// special endpoint to delete a bounty and all associated submissions (only for e2e tests)
export const DELETE = withWorkspace(async ({ params, workspace }) => {
  assertE2EWorkspace(workspace);

  const { bountyId } = params;

  await prisma.$transaction(async (tx) => {
    await tx.bountySubmission.deleteMany({
      where: {
        bountyId,
        programId: ACME_PROGRAM_ID,
      },
    });
    const bounty = await tx.bounty.delete({
      where: {
        id: bountyId,
        programId: ACME_PROGRAM_ID,
      },
    });

    if (bounty.workflowId) {
      await tx.workflow.delete({
        where: {
          id: bounty.workflowId,
          programId: ACME_PROGRAM_ID,
        },
      });
    }
  });

  return NextResponse.json({ id: bountyId });
});
