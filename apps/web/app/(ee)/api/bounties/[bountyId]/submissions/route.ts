import { getBountyOrThrow } from "@/lib/api/bounty/get-bounty-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { BountySubmissionSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// TODO:
// Add filter, pagination

// GET /api/bounties/[bountyId]/submissions - get all submissions for a bounty
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { bountyId } = params;
  const programId = getDefaultProgramIdOrThrow(workspace);

  await getBountyOrThrow({
    bountyId,
    programId,
  });

  const submissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId,
    },
    include: {
      user: true,
      partner: true,
      commission: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(z.array(BountySubmissionSchema).parse(submissions));
});
