import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";

export async function stripAdvancedRewardModifiersForProgram({
  programId,
}: {
  programId: string;
}): Promise<void> {
  await prisma.reward.updateMany({
    where: {
      programId,
      modifiers: {
        not: Prisma.DbNull,
      },
    },
    data: {
      modifiers: Prisma.DbNull,
    },
  });
}
