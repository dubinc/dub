import { DubApiError } from "@/lib/api/errors";
import { BountySubmissionHandler } from "@/lib/bounty/api/create-bounty-submission";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { createBountySubmissionInputSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/embed/referrals/submissions – submit a bounty via embed token
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment, program }) => {
    const partner = await prisma.partner.findUniqueOrThrow({
      where: { id: programEnrollment.partnerId },
      select: { id: true, name: true, image: true, email: true },
    });

    const body = createBountySubmissionInputSchema
      .omit({ programId: true })
      .parse(await req.json());

    try {
      const submission = await new BountySubmissionHandler({
        ...body,
        programId: program.id,
        partner,
      }).submit();

      return NextResponse.json(submission);
    } catch (e) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: e instanceof Error ? e.message : "Failed to submit bounty.",
      });
    }
  },
);
