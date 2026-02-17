import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  await prisma.bounty.update({
    where: {
      id: "bnty_1KHN6TRMW46QX3PK5EG31RZJY",
    },
    data: {},
  });
}

main();
