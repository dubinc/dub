import "dotenv-flow/config";
import prisma from "@/lib/prisma";

async function main() {
  const response = await prisma.project.updateMany({
    where: {
      plan: "pro",
    },
    data: {
      linksLimit: 1000,
      domainsLimit: 10,
      tagsLimit: 25,
      usersLimit: 5,
    },
  });

  console.log(response);
}

main();
