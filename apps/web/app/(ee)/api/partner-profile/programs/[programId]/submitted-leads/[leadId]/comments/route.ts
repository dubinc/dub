import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import { SubmittedLeadCommentSchema } from "@/lib/zod/schemas/submitted-leads";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/programs/[programId]/submitted-leads/[leadId]/comments
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { programId } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
    include: {},
  });

  const lead = await prisma.submittedLead.findUnique({
    where: {
      id: params.leadId,
      programId,
      partnerId: partner.id,
    },
    select: {
      id: true,
    },
  });

  if (!lead) {
    throw new DubApiError({
      code: "not_found",
      message: "Submitted lead not found.",
    });
  }

  const comments = await prisma.submittedLeadComment.findMany({
    where: {
      leadId: lead.id,
      partnerVisible: true,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(z.array(SubmittedLeadCommentSchema).parse(comments));
});
