import { LARGE_PROGRAM_IDS } from "@/lib/constants/program";
import { PartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";

export async function checkProgramNetworkRequirements({
  partner,
}: {
  partner: Pick<PartnerProps, "id">;
}) {
  const data = await prisma.partner.findUnique({
    where: {
      id: partner.id,
      programs: {
        some: {
          programId: {
            notIn: LARGE_PROGRAM_IDS,
          },
          status: "approved",
          totalCommissions: {
            gte: 10_00,
          },
        },
        none: {
          status: "banned",
        },
      },
    },
  });

  return data !== null;
}
