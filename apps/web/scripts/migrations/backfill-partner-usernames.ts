import { derivePartnerUsername } from "@/lib/api/partners/generate-partner-username";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import "dotenv-flow/config";

// Keep this modest so each prisma.$transaction stays short: fewer row locks held at once
// and less chance of lock waits
const BATCH_SIZE = 100;
const DELAY_MS = 100;

async function main() {
  let totalProcessed = 0;

  while (true) {
    const partners = await prisma.partner.findMany({
      where: {
        username: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (partners.length === 0) {
      break;
    }

    // Derive usernames and deduplicate within the batch
    const usernameEntries: { id: string; username: string }[] = [];
    const seenInBatch = new Set<string>();

    for (const partner of partners) {
      let username = derivePartnerUsername({
        name: partner.name,
        email: partner.email,
      });

      while (seenInBatch.has(username)) {
        username = `${username}-${nanoid(4).toLowerCase()}`;
      }

      seenInBatch.add(username);
      usernameEntries.push({ id: partner.id, username });
    }

    // Check conflicts against existing DB usernames
    const existingPartners = await prisma.partner.findMany({
      where: {
        username: {
          in: usernameEntries.map((e) => e.username),
        },
      },
      select: {
        username: true,
      },
    });

    const existingUsernames = new Set(existingPartners.map((p) => p.username));

    for (const entry of usernameEntries) {
      if (existingUsernames.has(entry.username)) {
        entry.username = `${entry.username}-${nanoid(4).toLowerCase()}`;
      }
    }

    await prisma.$transaction(
      usernameEntries.map(({ id, username }) =>
        prisma.partner.update({
          where: {
            id,
          },
          data: {
            username,
          },
        }),
      ),
    );

    totalProcessed += partners.length;

    console.log(
      `Backfilled ${partners.length} partner usernames (processed=${totalProcessed})`,
    );

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  console.log(
    `Done backfilling partner usernames (processed=${totalProcessed})`,
  );
}

main();
