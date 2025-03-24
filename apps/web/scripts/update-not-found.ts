import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const domains = await prisma.domain.updateMany({
    where: {
      placeholder: "https://getqr-dev.vercel.app/help/article/what-is-dub",
    },
    data: {
      placeholder: null,
    },
  });

  console.log(domains);
}

main();
