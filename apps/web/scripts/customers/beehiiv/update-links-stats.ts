import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const customerId = "cus_xxx";
  const oldLinkId = "link_xxx";
  const newLinkId = "link_xxx";

  const newLink = await prisma.link.findUniqueOrThrow({
    where: {
      id: newLinkId,
    },
  });

  await prisma.customer.update({
    where: {
      id: customerId,
    },
    data: {
      linkId: newLink.id,
      partnerId: newLink.partnerId,
    },
  });
  console.log(
    `Updated customer ${customerId} with linkId ${newLink.id} and partnerId ${newLink.partnerId}`,
  );

  const aggregateStats = await prisma.customer.groupBy({
    by: ["linkId"],
    where: {
      linkId: {
        in: [oldLinkId, newLinkId],
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      sales: true,
      saleAmount: true,
    },
  });

  console.log(aggregateStats);

  for (const stat of aggregateStats) {
    const { linkId, _count, _sum } = stat;
    if (!linkId) continue;
    await prisma.link.update({
      where: { id: linkId },
      data: {
        leads: _count?.id ?? 0,
        sales: _sum?.sales ?? 0,
        saleAmount: _sum?.saleAmount ?? 0,
      },
    });
    console.log(
      `Updated link ${linkId} with leads ${_count?.id ?? 0} and sales ${_sum?.sales ?? 0} and saleAmount ${_sum?.saleAmount ?? 0}`,
    );
  }
}

main();
