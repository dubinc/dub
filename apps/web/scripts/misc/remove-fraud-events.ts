import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const res = await prisma.$transaction([
    prisma.fraudEvent.deleteMany({
      where: {
        partnerId: "pn_xxx",
      },
    }),
    prisma.fraudEventGroup.deleteMany({
      where: {
        partnerId: "pn_xxx",
      },
    }),
  ]);

  console.log(res);
}

main();
