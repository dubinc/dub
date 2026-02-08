import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

// one-time script to get all workspaces/users that used conversion tracking on Dub in the last 3 months
async function main() {
  const projectsByCustomerCount = await prisma.customer.groupBy({
    by: ["projectId"],
    where: {
      createdAt: {
        gte: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000),
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
  });

  const projectUserEmails = await prisma.project.findMany({
    where: {
      id: {
        in: projectsByCustomerCount.map((project) => project.projectId),
      },
    },
    select: {
      id: true,
      slug: true,
      users: {
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
        where: {
          user: {
            email: {
              not: null,
            },
          },
        },
      },
    },
  });

  console.table(
    projectsByCustomerCount.map((project) => {
      const projectData = projectUserEmails.find(
        (p) => p.id === project.projectId,
      );

      return {
        id: project.projectId,
        slug: projectData?.slug,
        userEmails: projectData?.users.map((u) => u.user.email),
      };
    }),
  );

  const chunks = chunk(
    projectUserEmails.flatMap((p) => p.users.map((u) => u.user.email)),
    49,
  );

  for (const chunk of chunks) {
    console.log(chunk.join(", "));
  }
}

main();
