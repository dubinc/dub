import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";

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
