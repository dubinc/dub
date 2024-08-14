import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const totalDomains = await prisma.domain.count({
    where: {
      verified: true,
    },
  });

  const subdomains = await prisma.domain.count({
    where: {
      verified: true,
      OR: [
        {
          slug: {
            startsWith: "go.",
          },
        },
        {
          slug: {
            startsWith: "link.",
          },
        },
        {
          slug: {
            startsWith: "links.",
          },
        },
      ],
    },
  });

  const tldDomains = await prisma.domain.count({
    where: {
      verified: true,
      OR: [
        {
          slug: {
            endsWith: ".link",
          },
        },
        {
          slug: {
            endsWith: ".fyi",
          },
        },
        {
          slug: {
            endsWith: ".to",
          },
        },
      ],
    },
  });

  const domainProjects = await prisma.domain.findMany({
    where: {
      verified: true,
    },
    select: {
      slug: true,
      project: {
        select: {
          slug: true,
        },
      },
    },
  });

  const domainHacks = domainProjects.filter(
    (domain) => domain.project?.slug === domain.slug.replace(".", ""),
  );

  console.table(domainHacks);

  console.log({
    totalDomains,
    subdomains,
    tldDomains,
    domainHacks: domainHacks.length,
  });
}

main();
