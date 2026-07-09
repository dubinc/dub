import { prisma } from "@/lib/prisma";

export const retallyPayoutsAmount = async (payoutIdsToRetally: string[]) => {
  for (const payoutId of payoutIdsToRetally) {
    try {
      const commissionsSum = await prisma.commission.aggregate({
        where: {
          payoutId,
        },
        _sum: {
          earnings: true,
        },
      });
      const payoutAmount = commissionsSum._sum?.earnings ?? 0;
      if (payoutAmount > 0) {
        await prisma.payout.update({
          where: { id: payoutId },
          data: { amount: payoutAmount },
        });
        console.log(`Updated payout ${payoutId} with amount ${payoutAmount}`);
      } else {
        await prisma.payout.delete({
          where: { id: payoutId },
        });
        console.log(`Deleted payout ${payoutId} because it has no earnings`);
      }
    } catch (error) {
      console.error(`Error retallying payout ${payoutId}:`, error);
    }
  }
};
