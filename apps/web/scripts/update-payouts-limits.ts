import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.updateMany({
    where: {
      plan: "business",
    },
    data: {
      payoutsLimit: 2500_00,
    },
  });

  console.table(workspaces);
}

main();
