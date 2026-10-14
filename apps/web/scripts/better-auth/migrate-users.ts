import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 1000;

// Set emailVerifiedBa for users who already have an emailVerified timestamp.
async function main() {
  while (true) {
    const { count } = await prisma.user.updateMany({
      where: {
        emailVerified: {
          not: null,
        },
        emailVerifiedBa: false,
      },
      data: {
        emailVerifiedBa: true,
      },
      limit: BATCH_SIZE,
    });

    console.log(`Migrated ${count} users.`);

    if (count === 0) {
      console.log("Finished migrating users.");
      break;
    }
  }
}

main();
