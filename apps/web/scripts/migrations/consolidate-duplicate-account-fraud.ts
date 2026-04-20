import { createFraudEventHash } from "@/lib/api/fraud/utils";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  // Step 1
  // Migrate FraudRule
  const { count } = await prisma.fraudRule.updateMany({
    where: {
      type: "partnerDuplicatePayoutMethod",
    },
    data: {
      type: "partnerDuplicateAccount",
    },
  });

  console.log(
    `Updated ${count} fraud rules from partnerDuplicatePayoutMethod to partnerDuplicateAccount`,
  );

  // Step 2
  // Migrate FraudEventGroup
  while (true) {
    const { count } = await prisma.fraudEventGroup.updateMany({
      where: {
        type: "partnerDuplicatePayoutMethod",
      },
      data: {
        type: "partnerDuplicateAccount",
      },
      limit: 100,
    });

    console.log(
      `Updated ${count} fraud event groups from partnerDuplicatePayoutMethod to partnerDuplicateAccount`,
    );

    if (count === 0) {
      break;
    }
  }

  // Step 3
  // Recompute FraudEvent.hash for every event in a partnerDuplicateAccount
  // group. The hash formula mixes `type` into the digest, so events created
  // before the type rename still carry the old hash and would miss dedup in
  // createFraudEvents.
  let cursor: string | undefined;
  let totalUpdated = 0;

  while (true) {
    const events = await prisma.fraudEvent.findMany({
      where: {
        fraudEventGroup: {
          type: "partnerDuplicateAccount",
        },
      },
      select: {
        id: true,
        programId: true,
        partnerId: true,
        hash: true,
        fraudEventGroup: {
          select: {
            partnerId: true,
          },
        },
      },
      take: 200,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (events.length === 0) {
      break;
    }

    const hashesToUpdate = events.flatMap((event) => {
      const newHash = createFraudEventHash({
        type: "partnerDuplicateAccount",
        programId: event.programId,
        partnerId: event.fraudEventGroup.partnerId,
        metadata: { duplicatePartnerId: event.partnerId },
      });

      if (newHash === event.hash) {
        return [];
      }

      return [
        {
          id: event.id,
          hash: newHash,
        },
      ];
    });

    console.table(hashesToUpdate);

    await Promise.all(
      hashesToUpdate.map(({ id, hash }) =>
        prisma.fraudEvent.update({
          where: { id },
          data: { hash },
        }),
      ),
    );

    totalUpdated += hashesToUpdate.length;

    cursor = events[events.length - 1].id;
    console.log(`Recomputed hashes: ${totalUpdated} updated so far`);
  }

  console.log(`Done. Total FraudEvent hashes updated: ${totalUpdated}`);
}

main();
