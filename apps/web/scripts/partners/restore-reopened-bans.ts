import { prisma } from "@/lib/prisma";
import { chunk } from "@dub/utils";
import { Prisma, ProgramEnrollmentStatus } from "@prisma/client";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";
import { queuePartnerSearchSync } from "../../lib/api/partners/queue-partner-search-sync";

// A re-import set these enrollments back to approved and left bannedAt in
// place. A real unban clears bannedAt. Deactivated enrollments are left as-is.
//
// Does not re-send the ban email or re-cancel commissions and payouts.
// Those side effects already ran when the partner was banned.
//
// pnpm script partners/restore-reopened-bans
const DRY_RUN = true;
const BATCH_SIZE = 100;

async function main() {
  const enrollments = await findReopenedBans();

  console.log(`Found ${enrollments.length} reopened bans.`);
  console.table(
    enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      program: enrollment.program.slug,
      partnerId: enrollment.partnerId,
      email: enrollment.partner.email,
      status: enrollment.status,
      bannedAt: enrollment.bannedAt,
      bannedReason: enrollment.bannedReason,
    })),
  );

  if (DRY_RUN) {
    console.log("Dry run. Set DRY_RUN to false to restore these bans.");
    return;
  }

  let restored = 0;

  for (const batch of chunk(enrollments, BATCH_SIZE)) {
    const ids = batch.map((enrollment) => enrollment.id);

    const partnerIdsByProgramId = new Map<string, string[]>();

    for (const enrollment of batch) {
      const partnerIds = partnerIdsByProgramId.get(enrollment.programId) ?? [];
      partnerIds.push(enrollment.partnerId);
      partnerIdsByProgramId.set(enrollment.programId, partnerIds);
    }

    for (const [programId, partnerIds] of partnerIdsByProgramId) {
      const links = await prisma.link.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
          disabledAt: null,
        },
        select: {
          domain: true,
          key: true,
        },
      });

      if (links.length === 0) {
        continue;
      }

      await prisma.link.updateMany({
        where: {
          programId,
          partnerId: {
            in: partnerIds,
          },
          disabledAt: null,
        },
        data: {
          disabledAt: new Date(),
          expiresAt: new Date(),
        },
      });

      await linkCache.expireMany(links);
      console.log(`Disabled ${links.length} links in program ${programId}.`);
    }

    const { count } = await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: ids,
        },
        bannedAt: {
          not: null,
        },
        status: ProgramEnrollmentStatus.approved,
      },
      data: {
        status: ProgramEnrollmentStatus.banned,
        clickRewardId: null,
        leadRewardId: null,
        saleRewardId: null,
        referralRewardId: null,
        customRewardId: null,
        discountId: null,
      },
    });

    restored += count;

    await queuePartnerSearchSync({
      enrollmentIds: ids,
    });
  }

  console.log(`Restored ${restored} bans.`);
}

const reopenedBanSelect = {
  id: true,
  partnerId: true,
  programId: true,
  status: true,
  bannedAt: true,
  bannedReason: true,
  program: {
    select: {
      slug: true,
    },
  },
  partner: {
    select: {
      email: true,
    },
  },
} satisfies Prisma.ProgramEnrollmentSelect;

type ReopenedBan = Prisma.ProgramEnrollmentGetPayload<{
  select: typeof reopenedBanSelect;
}>;

async function findReopenedBans() {
  const enrollments: ReopenedBan[] = [];
  let cursor: string | undefined;

  while (true) {
    const batch = await prisma.programEnrollment.findMany({
      where: {
        bannedAt: {
          not: null,
        },
        status: ProgramEnrollmentStatus.approved,
      },
      select: reopenedBanSelect,
      orderBy: {
        id: "asc",
      },
      take: BATCH_SIZE,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
    });

    enrollments.push(...batch);

    if (batch.length < BATCH_SIZE) {
      return enrollments;
    }

    cursor = batch[batch.length - 1].id;
  }
}

main();
