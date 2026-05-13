import { prisma } from "@dub/prisma";
import { Prisma, SubmittedLeadStatus } from "@dub/prisma/client";
import "dotenv-flow/config";

const BATCH_SIZE = 100;

async function main() {
  let cursor: string | undefined;
  let totalProcessed = 0;
  let totalInserted = 0;

  while (true) {
    const referrals = await prisma.partnerReferral.findMany({
      take: BATCH_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: {
              id: cursor,
            },
          }
        : {}),
      orderBy: {
        id: "asc",
      },
    });

    if (referrals.length === 0) {
      break;
    }

    const data: Prisma.SubmittedLeadCreateManyInput[] = referrals.map((r) => ({
      // Preserve IDs (but change prefix) so historical references (e.g. ActivityLog.resourceId) remain valid.
      id: r.id.replace("ref_", "sbl_"),
      programId: r.programId,
      partnerId: r.partnerId,
      customerId: r.customerId,
      name: r.name,
      email: r.email,
      company: r.company,
      formData: (r.formData ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      status: r.status as unknown as SubmittedLeadStatus,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    const { count } = await prisma.submittedLead.createMany({
      data,
      skipDuplicates: true,
    });

    totalProcessed += referrals.length;
    totalInserted += count;

    console.log(
      `Backfilled ${count} submitted leads (batch=${referrals.length}, processed=${totalProcessed}, inserted=${totalInserted})`,
    );

    cursor = referrals[referrals.length - 1].id;
  }

  console.log(
    `Done backfilling submitted leads (processed=${totalProcessed}, inserted=${totalInserted})`,
  );
}

main();
