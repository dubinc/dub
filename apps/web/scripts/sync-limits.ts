import "dotenv-flow/config";
import prisma from "@/lib/prisma";

async function main() {
  const response = await prisma.project.updateMany({
    where: {
      plan: "pro",
    },
    data: {
      linksLimit: 250,
      domainsLimit: 10,
    },
  });

  console.log(response);
}

main();
