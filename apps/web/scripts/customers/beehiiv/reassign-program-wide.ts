import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { moveCustomerEvents } from "./reassign-tinybird";
import {
  buildOwnerMap,
  DRY_RUN,
  fixDiscountCodeLink,
  getCsvPath,
  loadCrossref,
  printResultSummary,
  PROGRAM_ID,
  reassignCustomer,
  ReassignResult,
  resyncTouchedLinkStats,
  resyncTouchedPartnerStats,
  retallyPayouts,
} from "./reassign-utils";

// ---------------------------------------------------------------------------
// fix every link/coupon-token collision in the program.
//
// Run dry (default):  pnpm script customers/beehiiv/reassign-program-wide
// Apply:              pnpm script customers/beehiiv/reassign-program-wide --apply
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `\n${DRY_RUN ? "🟡 DRY RUN" : "🔴 APPLY"} — program-wide reassignment\n`,
  );

  const ownerMap = buildOwnerMap(loadCrossref(getCsvPath()));
  console.log(`Loaded ${ownerMap.size} unique customers from crossref CSV.`);

  const results: ReassignResult[] = [];
  const tbFailures: string[] = [];
  let processed = 0;

  for (const [stripeCustomerId, correctAffiliateEmail] of ownerMap) {
    const result = await reassignCustomer(
      stripeCustomerId,
      correctAffiliateEmail,
    );
    results.push(result);

    if (
      result.status === "reassigned" &&
      result.customerId &&
      result.fromLinkId &&
      result.toLinkId
    ) {
      try {
        await moveCustomerEvents({
          customerId: result.customerId,
          oldLinkId: result.fromLinkId,
          newLinkId: result.toLinkId,
        });
      } catch (error) {
        console.error(
          `  ⚠️  Tinybird migration failed for ${stripeCustomerId}:`,
          error,
        );
        tbFailures.push(stripeCustomerId);
      }
    }

    if (++processed % 100 === 0) {
      console.log(`  ...processed ${processed}/${ownerMap.size}`);
    }
  }

  printResultSummary(results);

  // Re-point every mis-linked discount code in the program.
  console.log("\n=== Fixing mis-linked discount codes ===");
  const misLinkedDiscountCodes = await prisma.$queryRaw<{ id: string }[]>`
    SELECT dc.id
    FROM DiscountCode dc
    JOIN Link l ON l.id = dc.linkId
    WHERE dc.programId = ${PROGRAM_ID}
      AND dc.partnerId <> l.partnerId
  `;

  console.log(
    `Found ${misLinkedDiscountCodes.length} mis-linked discount codes.`,
  );

  const tally = {
    fixed: 0,
    wouldFix: 0,
    alreadyCorrect: 0,
    failed: 0,
    notFound: 0,
  };

  for (const { id } of misLinkedDiscountCodes) {
    const fix = await fixDiscountCodeLink(id);
    switch (fix.status) {
      case "fixed":
        tally.fixed++;
        break;
      case "would_fix":
        tally.wouldFix++;
        break;
      case "already_correct":
        tally.alreadyCorrect++;
        break;
      case "link_creation_failed":
        tally.failed++;
        console.log(`  ⚠️  link creation failed for ${fix.code}`);
        break;
      case "not_found":
        tally.notFound++;
        break;
    }
  }

  console.log(`Discount code fixes: ${JSON.stringify(tally)}`);

  console.log("\n=== Resyncing link stats ===");
  await resyncTouchedLinkStats();

  console.log("\n=== Resyncing partner stats ===");
  await resyncTouchedPartnerStats();

  console.log("\n=== Retallying affected payouts ===");
  await retallyPayouts();

  if (tbFailures.length > 0) {
    console.log(
      `\nTinybird migration failed for ${tbFailures.length} customer(s) ` +
        `(DB is correct — redo their events): ${tbFailures.join(", ")}`,
    );
  }

  console.log(
    `\n${DRY_RUN ? "🟡 DRY RUN complete — no changes written. Re-run with --apply to execute." : "🔴 Done."}`,
  );
}

main()
  .then(async () => {
    if (!DRY_RUN) await new Promise((r) => setTimeout(r, 2000));
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
