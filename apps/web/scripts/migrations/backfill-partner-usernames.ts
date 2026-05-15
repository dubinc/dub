import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import "dotenv-flow/config";

const BATCH_SIZE = 100;

async function main() {
  let totalProcessed = 0;

  while (totalProcessed < 200) {
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
        createdAt: "asc",
      },
    });

    if (partners.length === 0) {
      break;
    }

    // Derive usernames and deduplicate within the batch
    const usernameEntries: { id: string; username: string }[] = [];
    const seenInBatch = new Set<string>();

    for (const partner of partners) {
      let username = partner.name
        ? slugify(partner.name)
        : partner.email
          ? `${slugify(partner.email.split("@")[0])}`
          : null;

      if (!username) {
        continue;
      }

      username = `${username}-${nanoid(4).toLowerCase()}`;

      while (seenInBatch.has(username)) {
        username = `${username.slice(0, -5)}-${nanoid(4).toLowerCase()}`;
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
        entry.username = `${entry.username.slice(0, -5)}-${nanoid(4).toLowerCase()}`;
      }
    }

    console.log(usernameEntries);

    // await Promise.allSettled(
    //   usernameEntries.map(({ id, username }) =>
    //     prisma.partner.update({
    //       where: {
    //         id,
    //       },
    //       data: {
    //         username,
    //       },
    //     }),
    //   ),
    // );

    totalProcessed += partners.length;

    console.log(
      `Backfilled ${partners.length} partner usernames (processed=${totalProcessed})`,
    );
  }

  console.log(
    `Done backfilling partner usernames (processed=${totalProcessed})`,
  );
}

main();
