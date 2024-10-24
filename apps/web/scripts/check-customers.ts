import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const customerIds = await prisma.customer
    .findMany({
      select: {
        externalId: true,
      },
    })
    .then(
      (customers) =>
        customers
          .map((customer) => customer.externalId)
          .filter((id) => id !== null) as string[],
    );

  console.log(customerIds);

  const projects = await prisma.project
    .findMany({
      where: {
        plan: {
          not: "free",
        },
        users: {
          some: {
            userId: {
              in: customerIds,
            },
          },
        },
      },
      select: {
        name: true,
        slug: true,
        plan: true,
        users: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          where: {
            userId: {
              in: customerIds,
            },
          },
        },
      },
    })
    .then((projects) =>
      projects.map((project) => ({
        ...project,
        userId: project.users[0].user.id,
        email: project.users[0].user.email,
        users: undefined,
      })),
    );

  console.table(projects);
}

main();
