import "dotenv-flow/config";
import { prisma } from "@dub/prisma/node";

async function main() {
  await prisma.partner.deleteMany({
    where: {
      id: {
        in: ["pn_1KCNVNENQR34FT5Z2GBY6NR5J"],
      },
    },
  });
}

main();
