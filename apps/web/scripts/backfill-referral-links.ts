import { dub } from "@/lib/dub";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const workspaces = await prisma.project
    .findMany({
      where: {
        slug: {
          in: ["dub", "steven", "acme"],
        },
      },
      select: {
        id: true,
        slug: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })
    .then((workspaces) =>
      workspaces.map((workspace) => ({
        id: `ws_${workspace.id}`,
        slug: workspace.slug,
      })),
    );

  console.table(workspaces.slice(0, 10));

  const res = await dub.links.createMany(
    workspaces.map((workspace) => ({
      domain: "refer.dub.co",
      key: workspace.slug,
      url: "https://dub.co",
      externalId: `ws_${workspace.id}`,
      tagIds: ["cm000srqx0004o6ldehod07zc"],
      trackConversion: true,
    })),
  );

  console.log(res);
}

main();
