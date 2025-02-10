import { createId } from "@/lib/api/utils";
import { prisma } from "@dub/prisma";
import { EventType } from "@prisma/client";
import "dotenv-flow/config";

async function main() {
  const programs = await prisma.program.findMany();

  for (const program of programs) {
    const reward = await prisma.reward.create({
      data: {
        id: createId({ prefix: "rew_" }),
        programId: program.id,
        event: EventType.sale,
        type: program.commissionType,
        amount: program.commissionAmount,
        duration: program.commissionDuration,
        interval: program.commissionInterval,
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
      },
    });

    await prisma.program.update({
      where: {
        id: reward.programId,
      },
      data: {
        defaultRewardId: reward.id,
      },
    });

    console.log(`Migrated commission attributes for program ${program.id}`);
  }
}

main();
