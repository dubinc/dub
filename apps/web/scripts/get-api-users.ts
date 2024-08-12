import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        {
          tokens: {
            some: {},
          },
        },
        {
          restrictedTokens: {
            some: {},
          },
        },
      ],
    },
  });

  console.log(
    users
      .filter((user) => user.email)
      .map((user) => user.email)
      .join(", "),
  );
}

main();
