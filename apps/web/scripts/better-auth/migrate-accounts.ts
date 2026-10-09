import "dotenv-flow/config";

import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 1000;

// Copy NextAuth account columns into the empty Better Auth columns.
async function main() {
  while (true) {
    const count = await prisma.$executeRaw`
      UPDATE Account
      SET
        accountId = COALESCE(accountId, providerAccountId),
        providerId = COALESCE(providerId, provider),
        accessToken = COALESCE(accessToken, access_token),
        refreshToken = COALESCE(refreshToken, refresh_token),
        idToken = COALESCE(idToken, id_token)
      WHERE
        accountId IS NULL
        AND providerAccountId IS NOT NULL
      ORDER BY id
      LIMIT ${BATCH_SIZE}
    `;

    console.log(`Migrated ${count} accounts.`);

    if (count === 0) {
      console.log("Finished migrating accounts.");
      break;
    }
  }
}

main();
