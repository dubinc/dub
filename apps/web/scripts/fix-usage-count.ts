import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

function getLastMonthDate(billingCycleStart: number) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Set to the previous month
  const lastMonthDate = new Date(year, month - 1, billingCycleStart);

  return lastMonthDate;
}

function getThisMonthDate(billingCycleStart: number) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Set to the current month
  const thisMonthDate = new Date(year, month, billingCycleStart);

  return thisMonthDate;
}

async function main() {
  const projects = await prisma.project.findMany({
    where: {
      plan: {
        not: "free",
      },
      linksUsage: {
        gt: 0,
      },
      billingCycleStart: {
        lt: 7,
      },
    },
    select: {
      id: true,
      slug: true,
      linksUsage: true,
      billingCycleStart: true,
    },
  });

  const finalProjects = await Promise.all(
    projects.map(async (project) => {
      const links = await prisma.link.count({
        where: {
          projectId: project.id,
          createdAt: {
            gte: getThisMonthDate(project.billingCycleStart),
          },
        },
      });
      //   if (links !== project.linksUsage) {
      //     await prisma.project.update({
      //       where: {
      //         id: project.id,
      //       },
      //       data: {
      //         linksUsage: links,
      //       },
      //     });
      //   }
      return {
        ...project,
        links,
      };
    }),
  );

  console.table(finalProjects);
}

main();
