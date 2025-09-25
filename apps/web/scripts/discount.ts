import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.discount.delete({
      where: {
        id: "disc_1K5ZTBDHE4B18SZFZSRPPMNYF",
      },
    });
  });
}

main();
