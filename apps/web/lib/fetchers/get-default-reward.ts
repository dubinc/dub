import { prisma } from "@dub/prisma";
import { cache } from "react";

export const getDefaultReward = cache(
  async ({ programId }: { programId: string }) => {
    const rewards = await prisma.reward.findMany({
      where: {
        programId,
        default: true,
      },
    });

    const clickReward = rewards.find((r) => r.event === "click");
    const leadReward = rewards.find((r) => r.event === "lead");
    const saleReward = rewards.find((r) => r.event === "sale");

    return saleReward || leadReward || clickReward;
  },
);
