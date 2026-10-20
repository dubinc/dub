import "dotenv-flow/config";

import { getNormalizedEmail } from "@/lib/email/normalize-email";
import { prisma } from "@/lib/prisma";
import { sleep } from "@dub/utils";
import { Prisma } from "@prisma/client";

// TODO: Remove this script once the normalizedEmail backfill has finished
// running in production.

const DRY_RUN = true;
const BATCH_SIZE = 1000;
const THROTTLE_MS = 500;
const LAST_CURSOR_ID: string | null = null; // Paste the last printed cursor id here to resume after a crash.
const SAMPLE_SIZE = 20;

async function main() {
  console.log(
    `DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE} THROTTLE_MS=${THROTTLE_MS}`,
  );

  let startingAfter = LAST_CURSOR_ID ?? undefined;
  if (startingAfter) {
    console.log(`Resuming from ${startingAfter}`);
  }

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const sample: { id: string; email: string; normalizedEmail: string }[] = [];

  while (true) {
    const customers = await prisma.customer.findMany({
      where: {
        email: {
          not: null,
        },
        NOT: {
          email: "",
        },
        normalizedEmail: null,
        ...(startingAfter && {
          id: {
            gt: startingAfter,
          },
        }),
      },
      select: {
        id: true,
        email: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (customers.length === 0) {
      break;
    }

    totalScanned += customers.length;

    // Skip emails that normalize to null (e.g. empty strings), to match what
    // the write paths store via getNormalizedEmail
    const updates = customers
      .map(({ id, email }) => ({
        id,
        email,
        normalizedEmail: getNormalizedEmail(email),
      }))
      .filter(
        (u): u is { id: string; email: string; normalizedEmail: string } =>
          u.normalizedEmail !== null,
      );

    totalSkipped += customers.length - updates.length;

    if (sample.length < SAMPLE_SIZE) {
      sample.push(...updates.slice(0, SAMPLE_SIZE - sample.length));
    }

    let batchUpdated = 0;

    // The IS NULL guards skip rows that a write path or a redaction changed
    // after this batch was read
    if (!DRY_RUN && updates.length > 0) {
      batchUpdated = await prisma.$executeRaw`
        UPDATE Customer
        SET normalizedEmail = CASE id
          ${Prisma.join(
            updates.map(
              (u) => Prisma.sql`WHEN ${u.id} THEN ${u.normalizedEmail}`,
            ),
            " ",
          )}
        END
        WHERE id IN (${Prisma.join(updates.map((u) => u.id))})
          AND normalizedEmail IS NULL
          AND email IS NOT NULL
      `;

      totalUpdated += batchUpdated;
    }

    startingAfter = customers[customers.length - 1].id;

    console.log(
      `${DRY_RUN ? "Would update" : "Updated"} ${DRY_RUN ? updates.length : batchUpdated} of ${customers.length} customers. Cursor: ${startingAfter}`,
    );

    if (customers.length < BATCH_SIZE) {
      break;
    }

    await sleep(THROTTLE_MS);
  }

  console.table(sample);
  console.log(
    `DRY_RUN=${DRY_RUN} scanned=${totalScanned} updated=${totalUpdated} skipped=${totalSkipped}`,
  );
}

main();
