import { detectDuplicateIdentityFraud } from "@/lib/api/fraud/detect-duplicate-identity-fraud";
import { fetchVeriffSessionDecision } from "@/lib/veriff/fetch-veriff-session-decision";
import { VeriffRiskLabel, veriffRiskLabels } from "@/lib/veriff/schema";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

// Backfills `partnerDuplicateAccount` fraud events for partners whose Veriff decisions
// predate https://github.com/dubinc/dub/pull/3765. Re-fetches each decision and replays
// `detectDuplicateIdentityFraud`, which is idempotent via hash-based dedup.
async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      veriffSessionId: {
        not: null,
      },
    },
    select: {
      id: true,
      veriffSessionId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${partners.length} partners with a Veriff session.`);

  let scanned = 0;
  let matched = 0;
  let skipped = 0;
  let errored = 0;

  const batches = chunk(partners, 10);

  for (const [batchIndex, batch] of batches.entries()) {
    await Promise.all(
      batch.map(async ({ id: partnerId, veriffSessionId }) => {
        if (!veriffSessionId) {
          return;
        }

        try {
          const {
            verification: { riskLabels },
          } = await fetchVeriffSessionDecision(veriffSessionId);

          scanned += 1;

          const hasDuplicateRiskLabel =
            riskLabels &&
            riskLabels.length > 0 &&
            riskLabels.some(({ label }) =>
              veriffRiskLabels.includes(label as VeriffRiskLabel),
            );

          if (!hasDuplicateRiskLabel) {
            skipped += 1;
            return;
          }

          matched += 1;

          console.log(
            `[match] partner=${partnerId} session=${veriffSessionId} labels=${riskLabels
              ?.map(({ label }) => label)
              .join(",")}`,
          );

          await detectDuplicateIdentityFraud({
            veriffSessionId,
            riskLabels,
          });
        } catch (error) {
          errored += 1;
          console.error(
            `[error] partner=${partnerId} session=${veriffSessionId}`,
            error,
          );
        }
      }),
    );

    console.log(
      `Processed batch ${batchIndex + 1}/${batches.length} (scanned=${scanned}, matched=${matched}, skipped=${skipped}, errored=${errored})`,
    );
  }

  console.log(
    `Backfill complete. total=${partners.length} scanned=${scanned} matched=${matched} skipped=${skipped} errored=${errored}`,
  );
}

main();
