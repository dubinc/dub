import { prisma } from "@dub/prisma";
import { DubApiError } from "../api/errors";

interface GetSubmittedLeadOrThrowParams {
  leadId: string;
  programId: string;
}

export const getSubmittedLeadOrThrow = async ({
  leadId,
  programId,
}: GetSubmittedLeadOrThrowParams) => {
  const lead = await prisma.submittedLead.findUnique({
    where: {
      id: leadId,
    },
    include: {
      customer: true,
    },
  });

  if (!lead) {
    throw new DubApiError({
      code: "not_found",
      message: "Submitted lead not found.",
    });
  }

  if (lead.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: "You don't have access to this submitted lead.",
    });
  }

  return lead;
};
