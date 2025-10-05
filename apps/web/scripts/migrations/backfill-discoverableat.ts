import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      discoverableAt: null,
      users: {
        some: {},
      },
    },
    take: 2000,
  });

  const res = await prisma.partner.updateMany({
    where: {
      id: {
        in: partners.map((partner) => partner.id),
      },
    },
    data: { discoverableAt: new Date() },
  });

  console.log(`Updated ${res.count} partners with users to be discoverable`);
}

main();
