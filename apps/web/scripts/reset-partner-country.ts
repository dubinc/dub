import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// one time script to reset partner countries for programs that imported from another platform
// probably won't need it in the future
async function main() {
  const partners = await prisma.partner.updateMany({
    where: {
      country: "US",
      programs: {
        some: {
          programId: "xxx",
        },
      },
      users: {
        none: {},
      },
    },
    data: {
      country: null,
    },
  });
  console.log(partners);
}

main();
