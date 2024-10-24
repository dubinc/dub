import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project.findMany({
    select: {
      slug: true,
      plan: true,
      linksUsage: true,
      linksLimit: true,
    },
    orderBy: {
      linksUsage: "desc",
    },
    take: 100,
  });
  console.table(workspaces, ["slug", "plan", "linksUsage", "linksLimit"]);
}

main();
