import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const customerId = "cus_xxx";
  const newLinkId = "link_xxx";

  const newLink = await prisma.link.findUniqueOrThrow({
    where: {
      id: newLinkId,
    },
  });

  const updatedCommissions = await prisma.commission.updateMany({
    where: {
      customerId,
      status: {
        not: "processed",
      },
    },
    data: {
      linkId: newLink.id,
      partnerId: newLink.partnerId!,
    },
  });

  console.log(
    `Updated ${updatedCommissions.count} non-processed commissions to link ${newLink.id} and partner ${newLink.partnerId}`,
  );

  const processedCommissions = await prisma.commission.findMany({
    where: {
      customerId,
      status: "processed",
    },
  });

  console.log(
    `Found ${processedCommissions.length} processed commissions for customer ${customerId}`,
  );

  const updatedProcessedCommissions = await prisma.commission.updateMany({
    where: {
      id: {
        in: processedCommissions.map((commission) => commission.id),
      },
    },
    data: {
      linkId: newLink.id,
      partnerId: newLink.partnerId!,
      payoutId: null,
      status: "pending",
    },
  });

  console.log(
    `Updated ${updatedProcessedCommissions.count} processed commissions to link ${newLink.id} and partner ${newLink.partnerId}`,
  );

  const payoutIdsToRetally = Array.from(
    new Set(
      processedCommissions
        .map((commission) => commission.payoutId)
        .filter((payoutId): payoutId is string => Boolean(payoutId)),
    ),
  );

  for (const payoutId of payoutIdsToRetally) {
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
  }
}

main();
