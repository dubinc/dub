import { backfillCustomerNormalizedEmailBatch } from "@/lib/api/customers/backfill-customer-normalized-email";
import { backfillCustomerNormalizedEmailJob } from "@/lib/jobs/handlers/backfill-customer-normalized-email-job";
import "dotenv-flow/config";

const DRY_RUN = true;
const SAMPLE_SIZE = 20;

async function main() {
  if (!DRY_RUN) {
    await backfillCustomerNormalizedEmailJob.dispatch({});
    console.log("Dispatched backfill-customer-normalized-email-job");
    return;
  }

  let startingAfter: string | undefined;
  let totalScanned = 0;
  let totalWouldUpdate = 0;
  let totalSkipped = 0;
  let sample: { id: string; email: string; normalizedEmail: string }[] = [];

  while (true) {
    const { customers, updates, lastId, hasMore } =
      await backfillCustomerNormalizedEmailBatch({
        startingAfter,
        dryRun: true,
      });

    if (customers.length === 0) {
      break;
    }

    totalScanned += customers.length;
    totalWouldUpdate += updates.length;
    totalSkipped += customers.length - updates.length;

    if (sample.length < SAMPLE_SIZE) {
      sample = sample.concat(updates.slice(0, SAMPLE_SIZE - sample.length));
    }

    console.log(
      `Would update ${updates.length} of ${customers.length} customers. Cursor: ${lastId}`,
    );

    if (!hasMore || !lastId) {
      break;
    }

    startingAfter = lastId;
  }

  console.table(sample);
  console.log(
    `DRY_RUN=${DRY_RUN} scanned=${totalScanned} would-update=${totalWouldUpdate} skipped=${totalSkipped}`,
  );
}

main();
