import prisma from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      slug: true,
      plan: true,
      usage: true,
      _count: {
        select: {
          domains: true,
        },
      },
    },
    orderBy: {
      usage: "desc",
    },
    take: 100,
  });
  console.table(projects, ["slug", "plan", "usage", "_count"]);
}

main();
