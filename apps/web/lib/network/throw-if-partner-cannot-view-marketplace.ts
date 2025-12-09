import { DubApiError } from "@/lib/api/errors";
import {
  EXCLUDED_PROGRAM_IDS,
  PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
} from "@/lib/constants/partner-profile";
import { PartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";

// similar logic to partnerCanViewMarketplace but throws an error instead of returning a boolean
export async function throwIfPartnerCannotViewMarketplace({
  partner,
}: {
  partner: Pick<PartnerProps, "id">;
}) {
  const data = await prisma.partner.findUnique({
    where: {
      id: partner.id,
      OR: [
        {
          email: {
            endsWith: "@dub.co",
          },
        },
        {
          programs: {
            some: {
              programId: {
                notIn: EXCLUDED_PROGRAM_IDS,
              },
              status: "approved",
              totalCommissions: {
                gte: PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
              },
            },
            none: {
              status: "banned",
            },
          },
        },
      ],
    },
  });

  if (!data) {
    throw new DubApiError({
      code: "forbidden",
      message: "Program marketplace is not available for this partner.",
    });
  }
}
