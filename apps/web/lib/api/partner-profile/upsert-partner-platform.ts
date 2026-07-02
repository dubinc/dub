import { prisma } from "@/lib/prisma";
import { PartnerPlatform, Prisma } from "@prisma/client";

type UpsertPartnerPlatformParams = {
  where: Pick<PartnerPlatform, "partnerId" | "type" | "identifier">;
  data: Pick<Prisma.PartnerPlatformCreateInput, "verifiedAt" | "metadata">;
};

export async function upsertPartnerPlatform({
  where,
  data,
}: UpsertPartnerPlatformParams) {
  const { partnerId, type, identifier } = where;

  return await prisma.partnerPlatform.upsert({
    where: {
      partnerId_type_identifier: {
        partnerId,
        type,
        identifier,
      },
    },
    create: {
      partnerId,
      type,
      identifier,
      verifiedAt: data?.verifiedAt,
      metadata: data?.metadata,
    },
    update: {
      ...data,
    },
  });
}
