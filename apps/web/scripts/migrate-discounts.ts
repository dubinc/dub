// @ts-nocheck – this is a one-time migration script for
// when we migrate the program-wide discounts to the new schema

import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // Migrate program-wide discounts
  const programDiscounts = await prisma.discount.findMany({
    where: {
      defaultForProgram: {
        isNot: null,
      },
      default: false,
    },
    select: {
      id: true,
      programId: true,
    },
  });
  console.log({ programDiscounts });

  const finalProgramDiscounts = programDiscounts.map((discount) => {
    return {
      discountId: discount.id,
      programId: discount.programId,
    };
  });

  console.table(finalProgramDiscounts);

  // Update the default column in the Reward table
  const res1 = await prisma.discount.updateMany({
    where: {
      id: {
        in: finalProgramDiscounts.map((discount) => discount.discountId),
      },
    },
    data: {
      default: true,
    },
  });

  console.log({ res1 });

  for (const discount of finalProgramDiscounts) {
    const discountId = discount.discountId;

    const res2 = await prisma.programEnrollment.updateMany({
      where: {
        programId: discount.programId,
      },
      data: {
        discountId,
      },
    });

    console.log({ res2 });
  }
}

main();
