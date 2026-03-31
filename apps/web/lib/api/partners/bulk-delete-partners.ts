import { conn } from "@/lib/planetscale";
import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import { deleteDiscountCodes } from "../discounts/delete-discount-code";
import { bulkDeleteLinks } from "../links/bulk-delete-links";

const BATCH_SIZE = 250;

// bulk delete multiple partners and all associated links, customers, payouts, and commissions
// currently only used for the cron/cleanup/e2e-tests and cron/cleanup/demo-embed-partners jobs
export async function bulkDeletePartners({
  partnerIds,
  deletePartners,
}: {
  partnerIds: string[];
  deletePartners?: boolean;
}) {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: ACME_PROGRAM_ID,
      partnerId: {
        in: partnerIds,
      },
    },
    include: {
      links: true,
    },
  });

  console.log(
    `Found ${programEnrollments.length} program enrollments to delete`,
  );

  const linksToDelete = programEnrollments.flatMap((pe) => pe.links);
  const programEnrollmentIds = programEnrollments.map((pe) => pe.id);

  if (linksToDelete.length > 0) {
    while (true) {
      const customersToDelete = await prisma.customer.findMany({
        where: {
          linkId: {
            in: linksToDelete.map((link) => link.id),
          },
        },
        take: BATCH_SIZE,
      });

      if (customersToDelete.length === 0) {
        break;
      }

      const deletedCustomers = await prisma.customer.deleteMany({
        where: {
          id: {
            in: customersToDelete.map((customer) => customer.id),
          },
        },
      });
      console.log(`Deleted ${deletedCustomers.count} customers`);
    }

    const discountCodesToDelete = await prisma.discountCode.findMany({
      where: {
        linkId: {
          in: linksToDelete.map((link) => link.id),
        },
      },
      select: {
        id: true,
        code: true,
        programId: true,
      },
    });

    if (discountCodesToDelete.length > 0) {
      await deleteDiscountCodes(discountCodesToDelete);
    }

    await bulkDeleteLinks(linksToDelete);

    const deletedLinks = await prisma.link.deleteMany({
      where: {
        id: {
          in: linksToDelete.map((link) => link.id),
        },
      },
    });
    console.log(`Deleted ${deletedLinks.count} links`);
  }

  if (programEnrollmentIds.length > 0) {
    while (true) {
      const commissionsToDelete = await prisma.commission.findMany({
        where: {
          programEnrollment: {
            id: {
              in: programEnrollmentIds,
            },
          },
        },
        take: BATCH_SIZE,
      });

      if (commissionsToDelete.length === 0) {
        break;
      }

      const deletedCommissions = await prisma.commission.deleteMany({
        where: {
          id: {
            in: commissionsToDelete.map((commission) => commission.id),
          },
        },
      });
      console.log(`Deleted ${deletedCommissions.count} commissions`);
    }

    const deletedPayouts = await prisma.payout.deleteMany({
      where: {
        programEnrollment: {
          id: {
            in: programEnrollmentIds,
          },
        },
      },
    });
    console.log(`Deleted ${deletedPayouts.count} payouts`);

    // Delete the messages
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        programEnrollment: {
          id: {
            in: programEnrollmentIds,
          },
        },
      },
    });
    console.log(`Deleted ${deletedMessages.count} messages`);

    // Delete the bounty submissions
    const deletedBountySubmissions = await prisma.bountySubmission.deleteMany({
      where: {
        programEnrollment: {
          id: {
            in: programEnrollmentIds,
          },
        },
      },
    });
    console.log(`Deleted ${deletedBountySubmissions.count} bounty submissions`);

    // Delete the activity logs
    const deletedActivityLogs = await prisma.activityLog.deleteMany({
      where: {
        resourceType: "partner",
        resourceId: {
          in: partnerIds,
        },
      },
    });
    console.log(`Deleted ${deletedActivityLogs.count} activity logs`);

    const deletedProgramEnrollments = await prisma.programEnrollment.deleteMany(
      {
        where: {
          id: {
            in: programEnrollmentIds,
          },
        },
      },
    );
    console.log(
      `Deleted ${deletedProgramEnrollments.count} program enrollments`,
    );
  }

  if (deletePartners) {
    // using conn.execute here since Prisma is throwing a weird error
    const res = await conn.execute(
      `DELETE FROM Partner WHERE id IN (${partnerIds.map(() => "?").join(",")})`,
      partnerIds,
    );
    console.log(JSON.stringify(res, null, 2));

    console.log(`Deleted ${partnerIds.length} partners`);
  }
}
