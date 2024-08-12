import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const projects = await prisma.project.findMany({
    where: {
      plan: "pro",
      stripeId: {
        not: null,
      },
      createdAt: {
        lt: new Date("2024-01-17"),
      },
    },
    select: {
      slug: true,
      plan: true,
      createdAt: true,
      users: {
        select: {
          user: {
            select: {
              email: true,
            },
          },
        },
        where: {
          role: "owner",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  // console.table(
  //   projects.map((p) => ({
  //     ...p,
  //     emails: p.users.map((u) => u.user.email)[0],
  //   })),
  //   ["slug", "plan", "createdAt", "emails"],
  // );

  console.log(
    Array.from(
      new Set(projects.flatMap((p) => p.users.map((u) => u.user.email))),
    ).join(","),
  );
}

main();
