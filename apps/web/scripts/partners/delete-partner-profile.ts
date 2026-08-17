import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
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
          id: true,
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

  // Delete per enrollment so each bulkDeleteLinks call stays single-workspace
  for (const { links } of partner.programs) {
    if (links.length > 0) {
      await bulkDeleteLinks(links);
    }
  }

  // delete messages for partnerId
  const deletedMessages = await prisma.message.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log(`Deleted ${deletedMessages.count} messages`);

  // delete fraud event groups and alerts for partnerId
  const deletedFraudEventGroups = await prisma.fraudEventGroup.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log(`Deleted ${deletedFraudEventGroups.count} fraud event groups`);

  const deletedFraudAlerts = await prisma.fraudAlert.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log(`Deleted ${deletedFraudAlerts.count} fraud alerts`);

  const deletedProgramEnrollments = await prisma.programEnrollment.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log(`Deleted ${deletedProgramEnrollments.count} program enrollments`);

  // Queue an index update for the deleted enrollments.
  await queuePartnerSearchSync({
    enrollmentIds: partner.programs.map(({ id }) => id),
  });

  const deletedPartnerUsers = await prisma.partnerUser.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });
  console.log(`Deleted ${deletedPartnerUsers.count} partner users`);

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
