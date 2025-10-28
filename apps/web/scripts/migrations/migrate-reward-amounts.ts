import { RewardConditions } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import "dotenv-flow/config";

// One time script to migrate rewards from the old "amount" field to the new "amountInCents" and "amountInPercentage" fields.
async function main() {
  let totalMigrated = 0;
  const pageSize = 50;
  while (true) {
    const rewards = await prisma.reward.findMany({
      where: {
        amountInCents: null,
        amountInPercentage: null,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        modifiers: true,
      },
      take: pageSize,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (rewards.length === 0) {
      console.log("No more rewards to migrate.");
      break;
    }

    for (const reward of rewards) {
      const amount = reward.amount ?? 0;
      let amountInCents: number | null = null;
      let amountInPercentage: number | null = null;

      // Migrate main amount field
      if (reward.type === "flat") {
        amountInCents = amount;
      } else if (reward.type === "percentage") {
        amountInPercentage = amount;
      }

      // Migrate modifiers
      let updatedModifiers = reward.modifiers;
      if (reward.modifiers && Array.isArray(reward.modifiers)) {
        updatedModifiers = reward.modifiers.map(
          (modifier: RewardConditions & { amount?: number }) => {
            if (modifier.amount != null) {
              const modifierType = modifier.type || reward.type;
              const newModifier = { ...modifier };

              if (modifierType === "flat") {
                newModifier.amountInCents = modifier.amount;
              } else if (modifierType === "percentage") {
                newModifier.amountInPercentage = modifier.amount;
              }

              // Some of the old modifiers don't have a type, so we add it from the parent reward type
              if (!newModifier.type) {
                newModifier.type = modifierType;
              }
              return newModifier;
            }

            return modifier;
          },
        );
      }

      console.log(
        `Migrating reward ${reward.id}: type=${reward.type} amount=${amount} -> amountInCents=${amountInCents}, amountInPercentage=${amountInPercentage}`,
      );

      await prisma.reward.update({
        where: {
          id: reward.id,
        },
        data: {
          amountInCents,
          amountInPercentage,
          modifiers: updatedModifiers ?? Prisma.DbNull,
        },
      });

      totalMigrated++;
    }

    console.log(`Migrated batch of ${rewards.length} rewards`);
  }

  console.log(`Total rewards migrated: ${totalMigrated}`);
}

main();
