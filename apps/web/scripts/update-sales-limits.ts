import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.updateMany({
    where: {
      plan: "business",
      salesLimit: 0,
    },
    data: {
      salesLimit: 5000_00,
    },
  });

  console.table(workspaces);
}

main();
