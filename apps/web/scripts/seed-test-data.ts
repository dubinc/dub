import "dotenv-flow/config";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

const workspaceId = "cl7pj5kq4006835rbjlt2ofka";

async function main() {
  const users = [
    {
      id: "cm1ypncqa0000tc44pfgxp6qa",
      name: "John",
      email: "john@example.com",
      emailVerified: new Date(),
      passwordHash: await hashPassword("password"),
    },
    {
      id: "cm1ypncqa0000tc44pfgxp6qb",
      name: "Jane",
      email: "jane@example.com",
      emailVerified: new Date(),
      passwordHash: await hashPassword("password"),
    },
    {
      id: "cm1ypncqa0000tc44pfgxp6qc",
      name: "Jack",
      email: "jack@example.com",
      emailVerified: new Date(),
      passwordHash: await hashPassword("password"),
    },
  ];

  await prisma.user.createMany({
    data: users
  });

  await prisma.projectUsers.createMany({
    data: users.map((user) => ({
      userId: user.id,
      projectId: workspaceId,
    })),
  });
}

main();
