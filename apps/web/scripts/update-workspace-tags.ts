import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.updateMany({
    where: {
      plan: {
        notIn: ["free", "pro"],
      },
    },
    data: {
      tagsLimit: 1000000000,
    },
  });

  console.table(workspaces);
}

main();
