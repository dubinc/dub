import { bulkDeleteLinks } from "@/lib/api/links";
import { revalidateProgramPublicPages } from "@/lib/api/programs/revalidate-program-public-pages";
import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { R2_URL } from "@dub/utils";

export async function deleteProgramAdmin(programId: string) {
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
  });

  if (!program) {
    return null;
  }

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

  let deletedCustomers = 0;
  while (true) {
    const customers = await prisma.customer.findMany({
      where: {
        programId: program.id,
      },
      take: 250,
    });
    if (customers.length === 0) break;
    const deletedCustomersBatch = await prisma.customer.deleteMany({
      where: {
        id: {
          in: customers.map((customer) => customer.id),
        },
      },
    });
    deletedCustomers += deletedCustomersBatch.count;
    console.log("Deleted customers", deletedCustomersBatch.count);
  }

  const deletedPartnerGroups = await prisma.partnerGroup.deleteMany({
    where: {
      programId: program.id,
    },
  });
  console.log("Deleted partner groups", deletedPartnerGroups);

  revalidateProgramPublicPages(program.id);

  let deletedProgramEnrollments = 0;
  while (true) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId: program.id,
      },
      take: 250,
    });
    if (programEnrollments.length === 0) break;
    const deletedProgramEnrollmentsBatch =
      await prisma.programEnrollment.deleteMany({
        where: {
          id: {
            in: programEnrollments.map((enrollment) => enrollment.id),
          },
        },
      });
    deletedProgramEnrollments += deletedProgramEnrollmentsBatch.count;
    console.log(
      "Deleted program enrollments",
      deletedProgramEnrollmentsBatch.count,
    );
  }

  if (program.logo) {
    const deletedLogo = await storage.delete({
      key: program.logo.replace(`${R2_URL}/`, ""),
    });

    console.log("Deleted logo", deletedLogo);
  }

  await conn.execute(`DELETE FROM Program WHERE id = ?`, [program.id]);

  await prisma.project.update({
    where: {
      id: program.workspaceId,
    },
    data: {
      defaultProgramId: null,
    },
  });

  return {
    deletedCommissions,
    deletedPayouts,
    deletedRewards,
    deletedDiscounts,
    deletedCustomers,
    deletedPartnerGroups,
    deletedProgramEnrollments,
  };
}
