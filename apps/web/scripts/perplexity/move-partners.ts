import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const EMAIL_DOMAINS = [];

async function main() {
  const matchingPartners = await prisma.partner.findMany({
    where: {
      OR: EMAIL_DOMAINS.map((domain) => ({
        email: {
          endsWith: `@${domain}`,
        },
      })),
      programs: {
        some: {
          programId: "prog_xxx",
          groupId: "grp_xxx",
          status: "approved",
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.table(matchingPartners);

  const group = await prisma.partnerGroup.findUniqueOrThrow({
    where: {
      id: "grp_xxx",
    },
  });

  const { count } = await prisma.programEnrollment.updateMany({
    where: {
      partnerId: {
        in: matchingPartners.map((p) => p.id),
      },
      programId: "prog_xxx",
    },
    data: {
      groupId: group.id,
      clickRewardId: group.clickRewardId,
      leadRewardId: group.leadRewardId,
      saleRewardId: group.saleRewardId,
      discountId: group.discountId,
    },
  });
  console.log(`Moved ${count} partners to group ${group.id}`);
}

main();
