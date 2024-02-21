import prisma from "@/lib/prisma";
import "dotenv-flow/config";
import { nanoid } from "./utils";

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
    },
    where: {
      inviteCode: null,
    },
    take: 1000,
  });

  const res = await Promise.all(
    projects.map(async ({ id }) => {
      return prisma.project.update({
        where: {
          id,
        },
        data: {
          inviteCode: nanoid(24),
        },
      });
    }),
  );

  console.log(res.length);
}

main();
