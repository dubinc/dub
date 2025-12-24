import { prisma } from "@dub/prisma/node";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.updateMany({
    where: {
      plan: "free",
    },
    data: {
      foldersLimit: 0,
    },
  });

  console.log({ workspaces });
}

main();
