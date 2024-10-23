import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const projectSlug = "xxx";

async function main() {
  const owner = await prisma.projectUsers.findMany({
    where: {
      project: {
        slug: projectSlug,
      },
      role: "owner",
    },
    select: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  const updateOwner = await prisma.link.updateMany({
    where: {
      project: {
        slug: projectSlug,
      },
      userId: null,
    },
    data: {
      userId: owner[0].user.id,
    },
  });

  console.log(owner, updateOwner);
}

main();
