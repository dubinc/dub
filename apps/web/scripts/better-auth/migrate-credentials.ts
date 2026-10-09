import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 1000;

// Create a Better Auth credential account from each user's passwordHash.
async function main() {
  while (true) {
    const users = await prisma.user.findMany({
      where: {
        passwordHash: {
          not: null,
        },
        accounts: {
          none: {
            providerId: "credential",
          },
        },
      },
      select: {
        id: true,
        passwordHash: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (users.length === 0) {
      console.log("Finished migrating credentials.");
      break;
    }

    const { count } = await prisma.account.createMany({
      skipDuplicates: true,
      data: users.map((user) => ({
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: user.passwordHash,
      })),
    });

    console.log(`Migrated ${count} credentials.`);

    // No rows inserted while candidates remain means the batch cannot progress.
    if (count === 0) {
      console.error(
        `Stopped migrating credentials: ${users.length} users matched but no accounts were created.`,
      );
      process.exit(1);
    }
  }
}

main();
