import { parseRequestBody } from "@/lib/api/utils";
import { BountySubmissionHandler } from "@/lib/bounty/api/create-bounty-submission";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { prisma } from "@/lib/prisma";
import { createBountySubmissionInputSchema } from "@/lib/zod/schemas/bounties";
import { NextResponse } from "next/server";

// POST /api/embed/referrals/bounties/[bountyId]/submissions – submit a bounty via embed token
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment, params }) => {
    const { bountyId } = params;
    const parsedInput = createBountySubmissionInputSchema
      .omit({ programId: true, bountyId: true })
      .parse(await parseRequestBody(req));

    const partner = await prisma.partner.findUniqueOrThrow({
      where: {
        id: programEnrollment.partnerId,
      },
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
      },
    });

    const submissionHandler = new BountySubmissionHandler({
      ...parsedInput,
      bountyId,
      programId: programEnrollment.programId,
      partner,
    });

    const submission = await submissionHandler.submit();

    return NextResponse.json(submission);
  },
);
