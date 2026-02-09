import { RewardConditions } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import { randomUUID } from "node:crypto";

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
      continue;
    }

    const updatedModifiers = modifiers.map((m: RewardConditions) => {
      return {
        ...m,
        id: m.id ?? randomUUID(),
      };
    });

    await prisma.reward.update({
      where: { id: reward.id },
      data: { modifiers: updatedModifiers },
    });
  }
}

main();
