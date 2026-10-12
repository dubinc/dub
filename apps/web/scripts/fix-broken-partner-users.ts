import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  let batch = 0;
  while (true) {
    const partnerUserIds = await prisma.partnerUser.findMany({
      select: {
        partnerId: true,
      },
      take: 5000,
      skip: batch * 5000,
    });
    if (partnerUserIds.length === 0) {
      break;
    }
    const partners = await prisma.partner.findMany({
      where: {
        id: {
          in: partnerUserIds.map((partnerUser) => partnerUser.partnerId),
        },
      },
    });
    const partnersThatDontExist = partnerUserIds.filter(
      (partnerUser) =>
        !partners.some((partner) => partner.id === partnerUser.partnerId),
    );
    console.log(partnersThatDontExist);

    if (partnersThatDontExist.length > 0) {
      const deletedPartnerUsers = await prisma.partnerUser.deleteMany({
        where: {
          partnerId: {
            in: partnersThatDontExist.map(
              (partnerUser) => partnerUser.partnerId,
            ),
          },
        },
      });
      console.log(`Deleted ${deletedPartnerUsers.count} partner users`);
      const updatedUsers = await prisma.user.updateMany({
        where: {
          defaultPartnerId: {
            in: partnersThatDontExist.map(
              (partnerUser) => partnerUser.partnerId,
            ),
          },
        },
        data: {
          defaultPartnerId: null,
        },
      });
      console.log(`Reset defaultPartnerId for ${updatedUsers.count} users`);
    }
    batch++;
  }
}

main();
