import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      tokens: {
        some: {},
      },
    },
  });
  console.log(users.map((user) => user.email).join(", "));
}

main();
