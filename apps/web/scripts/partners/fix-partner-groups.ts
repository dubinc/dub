import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// fix approved partners with no groups
async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      slug: "acme",
    },
    include: {
      groups: {
        where: {
          slug: "default",
        },
      },
    },
  });

  const group = program.groups[0];

  if (!group) {
    console.log("No default group found");
    return;
  }

  const partnersMissingGroup = await prisma.programEnrollment.findMany({
    where: {
      programId: program.id,
      status: "approved",
      groupId: null,
    },
    include: {
      links: true,
    },
  });

  console.log(`Found ${partnersMissingGroup.length} partners missing group`);
  console.table(partnersMissingGroup);

  const updateMany = await prisma.programEnrollment.updateMany({
    where: {
      id: {
        in: partnersMissingGroup.map((partner) => partner.id),
      },
    },
    data: {
      groupId: group.id,
      clickRewardId: group.clickRewardId,
      leadRewardId: group.leadRewardId,
      saleRewardId: group.saleRewardId,
      discountId: group.discountId,
    },
  });

  console.log(`Updated ${updateMany.count} partners`);
}

main();
