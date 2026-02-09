import { RewardConditions } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import { v4 as uuid } from "uuid";

async function main() {
  const rewards = await prisma.reward.findMany({
    where: {
      modifiers: {
        not: Prisma.DbNull,
      },
    },
    select: {
      id: true,
      modifiers: true,
    },
  });

  if (rewards.length === 0) {
    return;
  }

  for (const reward of rewards) {
    const modifiers = reward.modifiers as RewardConditions[];

    const hasMissingId = modifiers.some(
      (m: { id?: string }) => m && typeof m === "object" && m.id == null,
    );

    if (!hasMissingId) {
      console.log(
        `Reward ${reward.id} has no missing modifier IDs, skipping...`,
      );
      continue;
    }

    const updatedModifiers = modifiers.map((m: RewardConditions) => {
      return {
        ...m,
        id: m.id ?? uuid(),
      };
    });

    await prisma.reward.update({
      where: { id: reward.id },
      data: { modifiers: updatedModifiers },
    });

    console.log(
      `Updated reward ${reward.id} with ${updatedModifiers.length} modifiers`,
    );
  }
}

main();
