import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

  // The insert loop reads passwordHash before it creates the credential account.
  // A password reset or change that commits in between updates only User, because
  // the credential account does not exist yet, so the inserted row keeps the old hash.
  // Reruns skip users that already have a credential account and cannot repair it.
  // Each batch update reads passwordHash at write time and overwrites any credential
  // account whose password or accountId no longer matches the user.
  let cursor = "";
  let reconciled = 0;

  while (true) {
    const accounts = await prisma.account.findMany({
      where: {
        providerId: "credential",
        id: {
          gt: cursor,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
    });

    if (accounts.length === 0) {
      break;
    }

    reconciled += await prisma.$executeRaw`
      UPDATE Account a
      INNER JOIN User u ON u.id = a.userId
      SET
        a.accountId = u.id,
        a.password = u.passwordHash
      WHERE
        a.id IN (${Prisma.join(accounts.map(({ id }) => id))})
        AND u.passwordHash IS NOT NULL
        AND (
          a.accountId IS NULL
          OR a.accountId != u.id
          OR a.password IS NULL
          OR a.password != u.passwordHash
        )
    `;

    cursor = accounts[accounts.length - 1].id;
  }

  console.log(`Reconciled ${reconciled} credentials.`);
}

main();
