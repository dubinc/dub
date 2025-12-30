import { prisma } from "@dub/prisma";
import { INFINITY_NUMBER } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.updateMany({
    where: {
      plan: {
        notIn: ["free", "pro"],
      },
    },
    data: {
      tagsLimit: INFINITY_NUMBER,
    },
  });

  console.table(workspaces);
}

main();
