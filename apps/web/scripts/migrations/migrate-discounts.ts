// @ts-nocheck – this is a one-time migration script for
// when we migrate the program-wide discounts to the new schema

import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const nonDefaultDiscounts = await prisma.discount.findMany({
    where: {
      defaultForProgram: null,
    },
    include: {
      _count: {
        select: {
          programEnrollments: true,
        },
      },
    },
  });
  console.log(
    `Found ${nonDefaultDiscounts.reduce(
      (acc, discount) => acc + discount._count.programEnrollments,
      0,
    )} program enrollments with non-default discounts`,
  );

  // Migrate program-wide discounts
  const programDiscount = await prisma.discount.findFirst({
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

  console.log({ programDiscount });

  if (!programDiscount) {
    console.log("No program discounts to migrate");
    return;
  }

  const { id: discountId, programId } = programDiscount;

  while (true) {
    const programEnrollmentsToUpdate = await prisma.programEnrollment.findMany({
      where: {
        programId,
        discountId: null, // only update if the discountId is null
      },
      take: 500,
    });

    if (programEnrollmentsToUpdate.length === 0) {
      break;
    }

    const data = await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: programEnrollmentsToUpdate.map((enrollment) => enrollment.id),
        },
      },
      data: {
        discountId,
      },
    });

    console.log(`Updated ${data.count} program enrollments`);
  }

  // Update the default column in the Reward table
  await prisma.discount.update({
    where: {
      id: programDiscount.id,
    },
    data: {
      default: true,
    },
  });

  console.log(
    `Updated program-wide discount ${programDiscount.id} to use default: true`,
  );
}

main();
