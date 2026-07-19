import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { conn } from "../../lib/planetscale";
import { stripeConnectClient } from "../stripe/connect-client";

async function main() {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: "pn_xxx",
    },
    include: {
      programs: {
        select: {
          links: true,
        },
      },
    },
  });

  const deletedCustomers = await prisma.customer.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log("Deleted customers", deletedCustomers);

  const commissionsToDelete = await prisma.commission.findMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log("Found commissions to delete", commissionsToDelete.length);

  const deletedActivityLogs = await prisma.activityLog.deleteMany({
    where: {
      resourceType: "commission",
      resourceId: {
        in: commissionsToDelete.map((commission) => commission.id),
      },
    },
  });
  console.log("Deleted activity logs", deletedActivityLogs);

  const deletedCommissions = await prisma.commission.deleteMany({
    where: {
      id: {
        in: commissionsToDelete.map((commission) => commission.id),
      },
    },
  });
  console.log("Deleted commissions", deletedCommissions);

  const deletedPayouts = await prisma.payout.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log("Deleted payouts", deletedPayouts);

  const deletedLinks = await prisma.link.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log("Deleted links", deletedLinks);

  const deletedProgramEnrollments = await prisma.programEnrollment.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log("Deleted program enrollments", deletedProgramEnrollments);

  // using conn.execute here since Prisma is throwing a weird error
  const res = await conn.execute(`DELETE FROM Partner WHERE id = ?`, [
    partner.id,
  ]);
  console.log(JSON.stringify(res, null, 2));

  if (partner.stripeConnectId) {
    const res = await stripeConnectClient.accounts.del(partner.stripeConnectId);
    console.log("Deleted Stripe account", partner.stripeConnectId, res);
  }
}

main();
