import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const discounts = await prisma.discount.findMany({
    select: {
      id: true,
      duration: true,
      interval: true,
    },
  });

  // Move the duration + interval into maxDuration
  for (const discount of discounts) {
    const maxDuration = discount.duration
      ? discount.interval === "month"
        ? discount.duration
        : discount.duration * 12
      : null;

    await prisma.discount.update({
      where: {
        id: discount.id,
      },
      data: {
        maxDuration,
      },
    });
  }
}

main();
