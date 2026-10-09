import { prismaEdge } from "@/lib/prisma/edge";
import { NETWORK_PROGRAM_ID } from "@dub/utils";

// partners without an approved program land on /programs, where they can find and apply to programs
export async function getPartnerLandingPath(partnerId: string) {
  const approvedEnrollment = await prismaEdge.programEnrollment.findFirst({
    where: {
      partnerId,
      status: "approved",
      programId: {
        not: NETWORK_PROGRAM_ID,
      },
    },
    select: {
      id: true,
    },
  });

  return approvedEnrollment ? "/overview" : "/programs";
}
