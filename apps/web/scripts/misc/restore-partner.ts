import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const partner = await prisma.partner.create({
    data: {
      id: "pn_xxx",
      name: "",
      email: "",
      users: {
        create: {
          userId: "user_xxx",
          role: "owner",
          notificationPreferences: {
            create: {},
          },
        },
      },
      programs: {
        create: {
          programId: "prog_xxx",
          tenantId: "tenant_xxx",
          groupId: "grp_xxx",
          saleRewardId: "rw_xxx",
          status: "approved",
        },
      },
    },
    include: {
      users: true,
      programs: true,
    },
  });

  console.log(partner);
}

main();
