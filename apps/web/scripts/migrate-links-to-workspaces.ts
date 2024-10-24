import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const DUB_PROJECT_ID = "cl7pj5kq4006835rbjlt2ofka";
const DUB_USER_ID = "cl7p1s07k000687rbuhpwqkqa";

async function main() {
  const users = await prisma.link.groupBy({
    by: ["userId"],
    _count: {
      id: true,
    },
    where: {
      projectId: DUB_PROJECT_ID,
      AND: [
        {
          userId: {
            not: null,
          },
        },
        {
          userId: {
            not: DUB_USER_ID,
          },
        },
      ],
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 500,
  });

  //   const projectsToCreate = (await Promise.all(
  //     users
  //       .filter(({ userId }) => userId !== null)
  //       .map(async (user) => {
  //         const u = await prisma.user.findUnique({
  //           where: {
  //             id: user.userId!,
  //           },
  //           select: {
  //             name: true,
  //             email: true,
  //           },
  //         });
  //         if (!u) {
  //           return null;
  //         }

  //         const projectName =
  //           capitalize(u.name ?? u.email?.split("@")[0]) + "'s Links";

  //         const projectSlug = slugify(u.email ?? "");

  //         return {
  //           userId: user.userId,
  //           name: u.name,
  //           email: u.email,
  //           links: user._count.id,
  //           projectName,
  //           projectSlug,
  //         };
  //       }),
  //   ).then((users) => users.filter((user) => user !== null))) as {
  //     userId: string;
  //     name: string | null;
  //     email: string | null;
  //     links: number;
  //     projectName: string;
  //     projectSlug: string;
  //   }[];

  //   await prisma.project.createMany({
  //     data: projectsToCreate.map(({ projectName, projectSlug }) => ({
  //       name: projectName,
  //       slug: projectSlug,
  //       billingCycleStart: new Date().getDate(),
  //     })),
  //     skipDuplicates: true,
  //   });

  //   const finalProjects = (await Promise.all(
  //     projectsToCreate.map(async (user) => {
  //       const project = await prisma.project.findUnique({
  //         where: {
  //           slug: user.projectSlug,
  //         },
  //       });
  //       return {
  //         ...user,
  //         projectId: project?.id,
  //       };
  //     }),
  //   )) as {
  //     userId: string;
  //     name: string | null;
  //     email: string | null;
  //     links: number;
  //     projectId: string;
  //     projectName: string;
  //     projectSlug: string;
  //   }[];

  //   const projectUsers = await prisma.projectUsers.createMany({
  //     data: finalProjects.map(({ userId, projectId }) => ({
  //       userId,
  //       projectId,
  //       role: "owner",
  //     })),
  //     skipDuplicates: true,
  //   });

  //   const links = await Promise.all(
  //     finalProjects.map(async (user) => {
  //       return await prisma.link.updateMany({
  //         where: {
  //           projectId: DUB_PROJECT_ID,
  //           userId: user.userId,
  //         },
  //         data: {
  //           projectId: user.projectId,
  //         },
  //       });
  //     }),
  //   );

  //   const redisHash = await redis.hset(
  //     "migrated_links_users",
  //     finalProjects.reduce((acc, { userId, projectId }) => {
  //       acc[userId] = projectId;
  //       return acc;
  //     }, {} as Record<string, string>),
  //   );

  console.log({ users });
}

main();
