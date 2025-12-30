import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
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

  if (deletePartners) {
    const deletedPartners = await prisma.partner.deleteMany({
      where: {
        id: {
          in: partnerIds,
        },
      },
    });
    console.log(`Deleted ${deletedPartners.count} partners`);
  } else {
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
}
