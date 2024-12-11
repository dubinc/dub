import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const DOMAIN = "x.com";
const PROJECT_ID = "xxx";

async function main() {
  const [links, project] = await Promise.all([
    prisma.link.updateMany({
      where: {
        domain: DOMAIN,
      },
      data: {
        projectId: PROJECT_ID,
      },
    }),
    prisma.project.findFirst({
      where: {
        domains: {
          some: {
            slug: DOMAIN,
          },
        },
      },
    }),
  ]);

  const response = await Promise.all([
    prisma.domain.update({
      where: {
        slug: DOMAIN,
      },
      data: {
        projectId: PROJECT_ID,
        primary: false,
      },
    }),
    prisma.project.update({
      where: {
        id: PROJECT_ID,
      },
      data: {
        usage: {
          increment: project?.usage,
        },
        linksUsage: {
          increment: links.count,
        },
      },
    }),
  ]);

  console.log({ response });
}

main();
