import { prisma } from "@/lib/prisma";
import { sleep } from "@dub/utils";
import { CommissionSource, CommissionStatus } from "@prisma/client";
import "dotenv-flow/config";

const DRY_RUN = true;
const BATCH_SIZE = 500;
const THROTTLE_MS = 200;
const LAST_CURSOR_ID: string | null = null; // Paste the last printed cursor id here to resume after a crash.

// FirstPromoter stores commission.id (a number) as invoiceId.
// Paid + no payoutId matches imports that were already paid in FirstPromoter.
const INTEGER_INVOICE_ID = /^[0-9]+$/;

async function main() {
  console.log(
    `DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE} THROTTLE_MS=${THROTTLE_MS}`,
  );

  let startingAfter = LAST_CURSOR_ID ?? undefined;
  if (startingAfter) {
    console.log(`Resuming from ${startingAfter}`);
  }

  let totalScanned = 0;
  let totalMatched = 0;
  let totalUpdated = 0;
  const matchesByProgram = new Map<string, number>();

  while (true) {
    const commissions = await prisma.commission.findMany({
      where: {
        status: CommissionStatus.paid,
        payoutId: null,
        source: null,
        invoiceId: {
          not: null,
        },
        ...(startingAfter && {
          id: {
            gt: startingAfter,
          },
        }),
      },
      select: {
        id: true,
        invoiceId: true,
        programId: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (commissions.length === 0) {
      break;
    }

    totalScanned += commissions.length;

    const matches = commissions.filter(
      (commission) =>
        commission.invoiceId != null &&
        INTEGER_INVOICE_ID.test(commission.invoiceId),
    );

    for (const match of matches) {
      matchesByProgram.set(
        match.programId,
        (matchesByProgram.get(match.programId) ?? 0) + 1,
      );
    }

    totalMatched += matches.length;

    if (DRY_RUN) {
      if (matches.length > 0) {
        console.table(
          matches.slice(0, 10).map((commission) => ({
            id: commission.id,
            programId: commission.programId,
            invoiceId: commission.invoiceId,
          })),
        );
      }

      console.log(
        `Batch: scanned=${commissions.length} matched=${matches.length}`,
      );
    } else if (matches.length > 0) {
      const { count } = await prisma.commission.updateMany({
        where: {
          id: {
            in: matches.map(({ id }) => id),
          },
        },
        data: {
          source: CommissionSource.firstpromoter,
        },
      });

      totalUpdated += count;
      console.log(
        `Batch: scanned=${commissions.length} matched=${matches.length} updated=${count}`,
      );
    } else {
      console.log(`Batch: scanned=${commissions.length} matched=0 updated=0`);
    }

    startingAfter = commissions[commissions.length - 1].id;
    console.log(`last cursor: ${startingAfter}`);

    if (commissions.length < BATCH_SIZE) {
      break;
    }

    await sleep(THROTTLE_MS);
  }

  console.log(
    `Finished. scanned=${totalScanned} matched=${totalMatched} ${DRY_RUN ? "would-update" : "updated"}=${DRY_RUN ? totalMatched : totalUpdated}`,
  );

  const programCounts = [...matchesByProgram.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([programId, count]) => ({ programId, count }));

  if (programCounts.length > 0) {
    console.log("Matches by program:");
    console.table(programCounts);
  }
}

main();
