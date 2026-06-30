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
  TARGET_DISCOUNT_CODE,
  TARGET_LINK_ID,
} from "./reassign-utils";

// ---------------------------------------------------------------------------
// fix a single colliding link (e.g. the one reported in a ticket).
//
// Dry run:   pnpm script customers/beehiiv/reassign-single-link --csv="..."
// Apply:     pnpm script customers/beehiiv/reassign-single-link --csv="..." --apply
// ---------------------------------------------------------------------------

async function main() {
  const targetLinkId = TARGET_LINK_ID;
  const discountCode = TARGET_DISCOUNT_CODE;

  console.log(
    `\n${DRY_RUN ? "🟡 DRY RUN" : "🔴 APPLY"} — reassignment for link ${targetLinkId}\n`,
  );

  const ownerMap = buildOwnerMap(loadCrossref(getCsvPath()));

  // Customers currently attributed to the target link.
  const customersOnLink = await prisma.customer.findMany({
    where: { programId: PROGRAM_ID, linkId: targetLinkId },
    select: { stripeCustomerId: true },
  });

  console.log(
    `Found ${customersOnLink.length} customers on link ${targetLinkId}.`,
  );

  const results: ReassignResult[] = [];
  const tbFailures: string[] = [];

  for (const { stripeCustomerId } of customersOnLink) {
    if (!stripeCustomerId) continue;

    // Only customers present in the mismatch CSV are misattributed; the rest are
    // genuinely the link owner's (link clicks) and stay put.
    const correctAffiliateEmail = ownerMap.get(stripeCustomerId);
    if (!correctAffiliateEmail) continue;

    const result = await reassignCustomer(
      stripeCustomerId,
      correctAffiliateEmail,
    );
    results.push(result);

    if (result.status === "reassigned") {
      console.log(
        `  ${DRY_RUN ? "would move" : "moved"} ${stripeCustomerId} → ${correctAffiliateEmail} ` +
          `(commissions: ${result.movedCommissions} moved, ${result.processedReset} reset, ${result.paidWithPayoutSkipped} paid-skipped)`,
      );
      // DB is committed (in its own transaction) before touching Tinybird, so a
      // TB failure leaves money/attribution correct and only needs an events redo.
      await migrateEvents(result, tbFailures);
    }
  }

  printResultSummary(results);

  // Re-point the colliding discount code to a fresh link owned by its partner.
  if (discountCode) {
    console.log(`\n=== Fixing discount code "${discountCode}" link ===`);
    const code = await prisma.discountCode.findFirst({
      where: { programId: PROGRAM_ID, code: discountCode },
      select: { id: true },
    });

    if (code) {
      console.log(`  ${JSON.stringify(await fixDiscountCodeLink(code.id))}`);
    } else {
      console.log(`  Discount code "${discountCode}" not found.`);
    }
  }

  console.log("\n=== Resyncing link stats ===");
  await resyncTouchedLinkStats();

  console.log("\n=== Resyncing partner stats ===");
  await resyncTouchedPartnerStats();

  console.log("\n=== Retallying affected payouts ===");
  await retallyPayouts();

  if (tbFailures.length > 0) {
    console.log(
      `\n⚠️  Tinybird migration failed for ${tbFailures.length} customer(s) ` +
        `(DB is correct — redo their events): ${tbFailures.join(", ")}`,
    );
  }

  console.log(
    `\n${DRY_RUN ? "🟡 DRY RUN complete — no changes written. Re-run with --apply to execute." : "🔴 Done."}`,
  );
}

async function migrateEvents(result: ReassignResult, tbFailures: string[]) {
  if (!result.customerId || !result.fromLinkId || !result.toLinkId) return;

  try {
    await moveCustomerEvents({
      customerId: result.customerId,
      oldLinkId: result.fromLinkId,
      newLinkId: result.toLinkId,
    });
  } catch (error) {
    console.error(
      `  ⚠️  Tinybird migration failed for ${result.stripeCustomerId}:`,
      error,
    );
    tbFailures.push(result.stripeCustomerId);
  }
}

main()
  .then(async () => {
    // let bulkCreateLinks' background cache propagation flush before exiting
    if (!DRY_RUN) await new Promise((r) => setTimeout(r, 2000));
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
