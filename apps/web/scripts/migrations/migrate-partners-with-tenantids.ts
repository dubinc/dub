import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const group = await prisma.partnerGroup.findUniqueOrThrow({
    where: {
      id: "grp_xxx",
    },
  });

  const users = await prisma.programEnrollment.updateMany({
    where: {
      programId: group.programId,
      tenantId: {
        not: null,
      },
      applicationId: null,
    },
    data: {
      groupId: group.id,
      saleRewardId: group.saleRewardId,
      leadRewardId: group.leadRewardId,
      clickRewardId: group.clickRewardId,
      discountId: group.discountId,
    },
  });

  console.log(users);
}

main();
