import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

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
