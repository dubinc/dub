import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

/**
 * One-off cleanup: remove duplicate-payout fraud involving a merged-away partner id.
 * Logic must match the transaction in `app/(ee)/api/cron/partners/merge-accounts/route.ts` (POST).
 *
 * Usage (from apps/web):
 *   pnpm script misc/repair-duplicate-payout-fraud-after-merge <sourcePartnerId> <targetPartnerId>
 *
 * Partner ids: pass two `pn_…` ids (works with `pnpm script`, which injects `--stack-size` before the script path).
 */
async function main() {
  const pnIds = process.argv.filter((a) => a.startsWith("pn_"));
  const [sourcePartnerId, targetPartnerId] = pnIds;

  if (!sourcePartnerId || !targetPartnerId) {
    console.error(
      "Usage: pnpm script misc/repair-duplicate-payout-fraud-after-merge <sourcePartnerId> <targetPartnerId>",
    );
    console.error(
      "  sourcePartnerId = merged-away (deleted) partner id\n  targetPartnerId = surviving partner id",
    );
    process.exit(1);
  }

  if (sourcePartnerId === targetPartnerId) {
    console.error("sourcePartnerId and targetPartnerId must differ.");
    process.exit(1);
  }

  console.log({
    sourcePartnerId,
    targetPartnerId,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fraudEvent.deleteMany({
        where: {
          partnerId: sourcePartnerId,
          fraudEventGroup: {
            type: "partnerDuplicatePayoutMethod",
          },
        },
      });

      const eventsWithDuplicateMeta = await tx.fraudEvent.findMany({
        where: {
          fraudEventGroup: {
            type: "partnerDuplicatePayoutMethod",
            partnerId: { in: [sourcePartnerId, targetPartnerId] },
          },
        },
        select: { id: true, metadata: true },
      });

      const idsFromMetadata = eventsWithDuplicateMeta
        .filter((e) => {
          const meta = e.metadata as Record<string, unknown> | null;
          return meta?.duplicatePartnerId === sourcePartnerId;
        })
        .map((e) => e.id);

      if (idsFromMetadata.length > 0) {
        await tx.fraudEvent.deleteMany({
          where: { id: { in: idsFromMetadata } },
        });
      }

      await tx.fraudEventGroup.deleteMany({
        where: {
          partnerId: sourcePartnerId,
          type: "partnerDuplicatePayoutMethod",
        },
      });

      const emptyTargetGroups = await tx.fraudEventGroup.findMany({
        where: {
          partnerId: targetPartnerId,
          type: "partnerDuplicatePayoutMethod",
          fraudEvents: { none: {} },
        },
        select: { id: true },
      });

      if (emptyTargetGroups.length > 0) {
        await tx.fraudEventGroup.deleteMany({
          where: {
            id: { in: emptyTargetGroups.map((g) => g.id) },
          },
        });
      }
    });

    console.log(
      "Done. Removed duplicate-payout fraud events/groups tied to the merged-away partner.",
    );
  } catch (error) {
    console.error(
      "Repair failed:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

main();
