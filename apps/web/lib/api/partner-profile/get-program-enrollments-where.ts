import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { Prisma, ProgramEnrollmentStatus } from "@prisma/client";

// the filters that GET /api/partner-profile/programs and /programs/count share,
// so that the counts match the list
export function getProgramEnrollmentsWhere({
  partnerId,
  status,
  search,
}: {
  partnerId: string;
  status?: ProgramEnrollmentStatus[];
  search?: string;
}): Prisma.ProgramEnrollmentWhereInput {
  return {
    partnerId,
    programId: { not: NETWORK_PROGRAM_ID },
    ...(status && { status: { in: status } }),
    program: {
      deactivatedAt: null,
      ...(search && { name: { contains: search } }),
    },
  };
}
