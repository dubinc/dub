import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

/**
 * Backfill Customer.programId / partnerId for customers created via Stripe
 * invoice.paid promo-code attribution before those fields were written on create
 *
 * Usage:
 *   pnpm --filter web script customers/beehiiv/backfill-customer-program-partner
 *   pnpm --filter web script customers/beehiiv/backfill-customer-program-partner -- --apply
 */

const WORKSPACE_ID = "ws_xxx";
const PROGRAM_ID = "prog_xxx";
const CREATED_AFTER = new Date("2026-06-01");
const CREATED_BEFORE = new Date("2026-07-01");

const APPLY = process.argv.includes("--apply");

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      projectId: WORKSPACE_ID,
      programId: null,
      createdAt: {
        gte: CREATED_AFTER,
        lt: CREATED_BEFORE,
      },
      link: {
        programId: PROGRAM_ID,
        partnerId: {
          not: null,
        },
      },
    },
    select: {
      id: true,
      email: true,
      linkId: true,
      programId: true,
      partnerId: true,
      createdAt: true,
      link: {
        select: {
          id: true,
          shortLink: true,
          programId: true,
          partnerId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${customers.length} customers to backfill`);

  if (customers.length === 0) {
    return;
  }

  const rows = customers.map((customer) => ({
    id: customer.id,
    email: customer.email,
    linkId: customer.linkId,
    shortLink: customer.link?.shortLink,
    currentProgramId: customer.programId,
    currentPartnerId: customer.partnerId,
    newProgramId: customer.link?.programId,
    newPartnerId: customer.link?.partnerId,
    createdAt: customer.createdAt.toISOString(),
  }));

  console.table(rows);

  const skipped = rows.filter((row) => !row.newProgramId || !row.newPartnerId);
  if (skipped.length > 0) {
    console.log(
      `Skipping ${skipped.length} customers with missing link.programId/partnerId`,
    );
  }

  const toUpdate = rows.filter((row) => row.newProgramId && row.newPartnerId);

  // Group by (programId, partnerId) so we can updateMany per cohort
  const groups = new Map<
    string,
    { programId: string; partnerId: string; ids: string[] }
  >();

  for (const row of toUpdate) {
    const programId = row.newProgramId!;
    const partnerId = row.newPartnerId!;
    const key = `${programId}:${partnerId}`;
    const group = groups.get(key) ?? { programId, partnerId, ids: [] };
    group.ids.push(row.id);
    groups.set(key, group);
  }

  console.log(`Grouped into ${groups.size} programId/partnerId cohorts`);

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to write updates.");
    return;
  }

  let totalUpdated = 0;

  for (const group of groups.values()) {
    const { count } = await prisma.customer.updateMany({
      where: {
        id: {
          in: group.ids,
        },
        projectId: WORKSPACE_ID,
        programId: null,
      },
      data: {
        programId: group.programId,
        partnerId: group.partnerId,
      },
    });

    totalUpdated += count;
    console.log(
      `Updated ${count} customers → programId=${group.programId} partnerId=${group.partnerId}`,
    );
  }

  console.log(`Done. Updated ${totalUpdated} / ${toUpdate.length} customers.`);
}

main();
