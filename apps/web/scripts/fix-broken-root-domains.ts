import { createLink } from "@/lib/api/links";
import { prisma } from "@dub/prisma";
import { DEFAULT_LINK_PROPS } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const domainsWithNoLinks = await prisma.domain.findMany({
    where: {
      links: {
        none: {
          key: "_root",
        },
      },
    },
    select: {
      slug: true,
      _count: {
        select: {
          links: true,
        },
      },
      createdAt: true,
      project: {
        select: {
          slug: true,
          users: {
            select: {
              userId: true,
            },
          },
        },
      },
      projectId: true,
    },
    take: 10,
    orderBy: {
      createdAt: "asc",
    },
  });

  await Promise.all(
    domainsWithNoLinks.map(async (domain) => {
      if (!domain.project?.users[0].userId) {
        console.log(`No user found for domain ${domain.slug}`);
        return;
      }

      const res = await createLink({
        ...DEFAULT_LINK_PROPS,
        domain: domain.slug,
        key: "_root",
        url: "",
        tags: undefined,
        createdAt: domain.createdAt,
        projectId: domain.projectId,
        userId: domain.project?.users[0].userId,
      });
      console.log({ res });
    }),
  );

  console.table(domainsWithNoLinks);
}

main();
