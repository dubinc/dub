import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const response = await prisma.project.updateMany({
    where: {
      plan: "business",
    },
    data: {
      domainsLimit: 40,
    },
  });

  console.log(response);
}

main();
