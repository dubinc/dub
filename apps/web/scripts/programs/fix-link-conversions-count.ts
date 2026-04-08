import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { syncPartnerLinksStats } from "../../lib/api/partners/sync-partner-links-stats";

// this is to tally a link's conversion count based on the number of customers that have made a sale
async function main() {
  const partnerLinks = await prisma.link.findMany({
    where: {
      programId: "prog_xxx",
    },
    select: {
      id: true,
      conversions: true,
    },
  });

  const partnerCustomers = await prisma.customer.groupBy({
    by: ["linkId"],
    where: {
      linkId: {
        in: partnerLinks.map((l) => l.id),
      },
      saleAmount: {
        gt: 0,
      },
    },
    _count: {
      _all: true,
    },
  });

  const partnerLinksToUpdate = partnerLinks
    .map((l) => ({
      linkId: l.id,
      conversions: l.conversions,
      actualConversions:
        partnerCustomers.find((c) => c.linkId === l.id)?._count._all ?? 0,
    }))
    .filter((l) => l.conversions !== l.actualConversions);

  console.log(partnerLinksToUpdate);

  for (const link of partnerLinksToUpdate) {
    const res = await prisma.link.update({
      where: { id: link.linkId },
      data: { conversions: link.actualConversions },
    });
    console.log(
      `Updated ${link.linkId} from ${link.conversions} to ${res.conversions} conversions`,
    );
    const syncRes = await syncPartnerLinksStats({
      partnerId: res.partnerId!,
      programId: res.programId!,
      eventType: "sale",
    });
    console.log(syncRes);
  }
}

main();
