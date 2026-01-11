import { prisma } from "@dub/prisma";
import { PlatformType, Prisma } from "@dub/prisma/client";

type UpsertPartnerPlatformParams = {
  where: {
    partnerId: string;
    type: PlatformType;
  };
  data: Pick<
    Prisma.PartnerPlatformCreateInput,
    "identifier" | "verifiedAt" | "metadata"
  >;
};

export async function upsertPartnerPlatform({
  where,
  data,
}: UpsertPartnerPlatformParams) {
  const { partnerId, type } = where;

  return await prisma.partnerPlatform.upsert({
    where: {
      partnerId_type: {
        partnerId,
        type,
      },
    },
    create: {
      partnerId,
      type,
      identifier: data.identifier,
      verifiedAt: data.verifiedAt,
      metadata: data.metadata,
    },
    update: {
      identifier: data.identifier,
      verifiedAt: data.verifiedAt,
      metadata: data.metadata,
    },
  });
}
