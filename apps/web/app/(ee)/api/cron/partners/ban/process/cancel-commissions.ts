import { prisma } from "@dub/prisma";

// Mark the commissions as cancelled
export async function cancelCommissions({
  programId,
  partnerId,
}: {
  programId: string;
  partnerId: string;
}) {
  let canceledCommissions = 0;
  let failedBatches = 0;
  const maxRetries = 3;

  while (true) {
    try {
      const commissions = await prisma.commission.findMany({
        where: {
          programId,
          partnerId,
          status: "pending",
        },
        select: {
          id: true,
        },
        orderBy: {
          id: "asc",
        },
        take: 500,
      });

      if (commissions.length === 0) {
        break;
      }

      const { count } = await prisma.commission.updateMany({
        where: {
          id: {
            in: commissions.map((c) => c.id),
          },
        },
        data: {
          status: "canceled",
        },
      });

      canceledCommissions += count;
    } catch (error) {
      failedBatches++;

      // If we've failed too many times, break to avoid infinite loop
      if (failedBatches >= maxRetries) {
        console.error(
          `Failed to cancel commissions after ${maxRetries} attempts. Stopping batch processing.`,
        );
        break;
      }

      // Wait a bit before retrying the same batch
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (failedBatches > 0) {
    console.warn(
      `Cancelled ${canceledCommissions} commissions with ${failedBatches} failed batch(es).`,
    );
  } else {
    console.info(`Cancelled ${canceledCommissions} commissions.`);
  }
}
