import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const updateOwner = await prisma.link.updateMany({
    where: {
      url: {
        contains: "evirtualservices.co",
      },
      userId: null,
    },
    data: {
      userId: "clqei1lgc0000vsnzi01pbf47",
    },
  });

  console.log(updateOwner);
}

main();
