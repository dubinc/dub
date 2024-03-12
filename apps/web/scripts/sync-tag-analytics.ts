import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { DUB_PROJECT_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      projectId: DUB_PROJECT_ID,
      tags: {
        some: {},
      },
    },
    include: {
      tags: true,
    },
  });

  const res = await Promise.all(links.map((link) => recordLink({ link })));

  console.log(res);
}

main();
