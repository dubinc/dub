import { PartnerProps } from "@/lib/types";
import {
  PROGRAM_NETWORK_PARTNER_MIN_PAYOUTS,
  PROGRAM_NETWORK_PARTNER_MIN_PROGRAMS,
} from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";

export async function checkProgramNetworkRequirements({
  partner,
}: {
  partner: Pick<PartnerProps, "id">;
}) {
  const data = await prisma.partner.findUniqueOrThrow({
    where: {
      id: partner.id,
    },
    select: {
      _count: {
        select: {
          programs: { where: { status: "approved" } },
          payouts: true,
        },
      },
    },
  });

  return (
    data._count.programs >= PROGRAM_NETWORK_PARTNER_MIN_PROGRAMS &&
    data._count.payouts >= PROGRAM_NETWORK_PARTNER_MIN_PAYOUTS
  );
}
