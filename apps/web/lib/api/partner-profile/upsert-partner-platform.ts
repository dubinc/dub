import { prisma } from "@/lib/prisma";
import { MAX_PLATFORMS_PER_TYPE } from "@/lib/social-utils";
import { PartnerPlatform, Prisma } from "@prisma/client";

type UpsertPartnerPlatformParams = {
  where: Pick<PartnerPlatform, "partnerId" | "type" | "identifier">;
  data?: Pick<Prisma.PartnerPlatformCreateInput, "verifiedAt" | "metadata">;
};

export async function upsertPartnerPlatform({
  where,
  data,
}: UpsertPartnerPlatformParams) {
  const { partnerId, type, identifier } = where;

  const existingPlatform = await prisma.partnerPlatform.findFirst({
    where: {
      partnerId,
      type,
      identifier,
    },
    select: {
      id: true,
    },
  });

  if (existingPlatform) {
    // Nothing to write — leave the row untouched
    if (data?.verifiedAt === undefined && data?.metadata === undefined) {
      return existingPlatform;
    }

    return await prisma.partnerPlatform.update({
      where: {
        id: existingPlatform.id,
      },
      data: {
        verifiedAt: data.verifiedAt,
        metadata: data.metadata,
      },
    });
  }

  return await prisma.partnerPlatform.create({
    data: {
      partnerId,
      type,
      identifier,
      verifiedAt: data?.verifiedAt,
      metadata: data?.metadata,
    },
  });
}

export async function assertPartnerPlatformLimit({
  partnerId,
  type,
  identifier,
}: Pick<PartnerPlatform, "partnerId" | "type" | "identifier">) {
  const existingPlatforms = await prisma.partnerPlatform.findMany({
    where: {
      partnerId,
      type,
    },
    select: {
      identifier: true,
    },
  });

  // Re-verifying / updating an existing handle is always allowed
  const alreadyExists = existingPlatforms.some(
    (p) => p.identifier === identifier,
  );

  if (alreadyExists) {
    return;
  }

  if (existingPlatforms.length >= MAX_PLATFORMS_PER_TYPE) {
    throw new Error(
      `You can add up to ${MAX_PLATFORMS_PER_TYPE} ${type} handles.`,
    );
  }
}
