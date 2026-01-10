import { prisma } from "@dub/prisma";
import { Prisma, SocialPlatform } from "@dub/prisma/client";

type UpsertPartnerPlatformParams = {
  where: {
    partnerId: string;
    platform: SocialPlatform;
  };
  data: Pick<
    Prisma.PartnerPlatformCreateInput,
    "handle" | "verifiedAt" | "metadata"
  >;
};

export async function upsertPartnerPlatform({
  where,
  data,
}: UpsertPartnerPlatformParams) {
  const { partnerId, platform } = where;

  return await prisma.partnerPlatform.upsert({
    where: {
      partnerId_platform: {
        partnerId,
        platform,
      },
    },
    create: {
      partnerId,
      platform,
      handle: data.handle,
      verifiedAt: data.verifiedAt,
      metadata: data.metadata,
    },
    update: {
      handle: data.handle,
      verifiedAt: data.verifiedAt,
      metadata: data.metadata,
    },
  });
}
