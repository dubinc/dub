import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.updateMany({
    where: {
      plan: {
        startsWith: "business",
      },
    },
    data: {
      payoutsLimit: 2_500_00,
    },
  });

  console.table(workspaces);
}

main();
