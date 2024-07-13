import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const domain = "song.fyi";

async function main() {
  const links = await prisma.link.updateMany({
    where: {
      domain,
    },
    data: {
      archived: true,
    },
  });
  console.log(links);
}

main();
