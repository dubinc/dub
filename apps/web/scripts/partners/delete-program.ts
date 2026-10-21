import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { bulkDeleteLinks } from "../../lib/api/links";
import { storage } from "../../lib/storage";
import { getOwnedAssetKey } from "../../lib/storage/asset-keys";

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: "prog_xxx",
    },
  });

  const deletedCommissions = await prisma.commission.deleteMany({
    where: {
      programId: program.id,
    },
  });
  console.log("Deleted commissions", deletedCommissions);

  const deletedPayouts = await prisma.payout.deleteMany({
    where: {
      programId: program.id,
    },
  });
  console.log("Deleted payouts", deletedPayouts);

  const deletedRewards = await prisma.reward.deleteMany({
    where: {
      programId: program.id,
    },
  });
  console.log("Deleted rewards", deletedRewards);

  const deletedDiscounts = await prisma.discount.deleteMany({
    where: {
      programId: program.id,
    },
  });

  console.log("Deleted discounts", deletedDiscounts);

  const links = await prisma.link.findMany({
    where: {
      programId: program.id,
    },
  });
  await bulkDeleteLinks(links);

  while (true) {
    const customers = await prisma.customer.findMany({
      where: {
        programId: program.id,
      },
      take: 250,
    });
    if (customers.length === 0) break;
    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        id: {
          in: customers.map((customer) => customer.id),
        },
      },
    });
    console.log("Deleted customers", deletedCustomers);
  }

  const deletedPartnerGroups = await prisma.partnerGroup.deleteMany({
    where: {
      programId: program.id,
    },
  });
  console.log("Deleted partner groups", deletedPartnerGroups);

  while (true) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: program.id,
      },
      take: 250,
    });
    if (programEnrollments.length === 0) break;
    const deletedProgramEnrollments = await prisma.programEnrollment.deleteMany(
      {
        where: {
          id: {
            in: programEnrollments.map((enrollment) => enrollment.id),
          },
        },
      },
    );
    console.log("Deleted program enrollments", deletedProgramEnrollments);
  }

  const logoKey = getOwnedAssetKey({
    kind: "programLogo",
    ownerId: program.id,
    url: program.logo,
  });

  if (logoKey) {
    const deletedLogo = await storage.delete({
      key: logoKey,
    });

    console.log("Deleted logo", deletedLogo);
  }

  await prisma.project.update({
    where: {
      id: program.workspaceId,
    },
    data: {
      defaultProgramId: null,
    },
  });
}

main();
