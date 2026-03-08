/*
To use this file, first update packages/prisma/index.ts to the following:

import { PrismaClient } from "@prisma/client";
import "dotenv-flow/config";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export const prismaOld = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_OLD,
    },
  },
});

Then, replace `prisma as prismaOld` below with just `prismaOld`
*/

import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
// import { prisma, prismaOld } from "@dub/prisma";
import { prisma, prisma as prismaOld } from "@dub/prisma";
import "dotenv-flow/config";
import { stripeAppClient } from "../../lib/stripe";
import { recordLink } from "../../lib/tinybird";

async function main() {
  const partnerId = "pn_xxx";

  const programEnrollmentsToRestore =
    await prismaOld.programEnrollment.findMany({
      where: {
        partnerId,
      },
    });

  const res = await prisma.programEnrollment.createMany({
    data: programEnrollmentsToRestore,
  });
  console.log(`Restored ${res.count} program enrollments`);

  // Restore payouts first (commissions may reference payoutId)
  const payoutsToRestore = await prismaOld.payout.findMany({
    where: { partnerId },
  });
  if (payoutsToRestore.length > 0) {
    const { count: createdPayoutsCount } = await prisma.payout.createMany({
      data: payoutsToRestore,
      skipDuplicates: true,
    });
    console.log(`Restored ${createdPayoutsCount} payouts`);
  }

  const commissionsToRestore = await prismaOld.commission.findMany({
    where: { partnerId },
  });
  if (commissionsToRestore.length > 0) {
    const { count: createdCommissionsCount } =
      await prisma.commission.createMany({
        data: commissionsToRestore,
        skipDuplicates: true,
      });
    console.log(`Restored ${createdCommissionsCount} commissions`);
  }

  const messagesToRestore = await prismaOld.message.findMany({
    where: { partnerId },
  });
  if (messagesToRestore.length > 0) {
    const { count: createdMessagesCount } = await prisma.message.createMany({
      data: messagesToRestore,
      skipDuplicates: true,
    });
    console.log(`Restored ${createdMessagesCount} messages`);
  }

  const bountySubmissionsToRestore = await prismaOld.bountySubmission.findMany({
    where: { partnerId },
  });
  if (bountySubmissionsToRestore.length > 0) {
    const { count: createdBountySubmissionsCount } =
      await prisma.bountySubmission.createMany({
        data: bountySubmissionsToRestore as never,
        skipDuplicates: true,
      });
    console.log(`Restored ${createdBountySubmissionsCount} bounty submissions`);
  }

  const activityLogsToRestore = await prismaOld.activityLog.findMany({
    where: {
      resourceType: "partner",
      resourceId: partnerId,
    },
  });
  if (activityLogsToRestore.length > 0) {
    const { count: createdActivityLogsCount } =
      await prisma.activityLog.createMany({
        data: activityLogsToRestore as never,
        skipDuplicates: true,
      });
    console.log(`Restored ${createdActivityLogsCount} activity logs`);
  }

  const linksToRestore = await prismaOld.link.findMany({
    where: { partnerId },
  });
  if (linksToRestore.length > 0) {
    const { count: createdLinksCount } = await prisma.link.createMany({
      data: linksToRestore as never,
      skipDuplicates: true,
    });
    console.log(`Restored ${createdLinksCount} links`);

    const linkTagsToRestore = await prismaOld.linkTag.findMany({
      where: { linkId: { in: linksToRestore.map((link) => link.id) } },
    });
    const { count: createdLinkTagsCount } = await prisma.linkTag.createMany({
      data: linkTagsToRestore as never,
      skipDuplicates: true,
    });
    console.log(`Restored ${createdLinkTagsCount} link tags`);

    const restoredLinks = await prisma.link.findMany({
      where: { partnerId },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    const tbRes = await recordLink(restoredLinks);
    console.log("tbRes", tbRes);

    const customersToRestore = await prismaOld.customer.findMany({
      where: { linkId: { in: linksToRestore.map((link) => link.id) } },
    });
    if (customersToRestore.length > 0) {
      const { count: createdCustomersCount } = await prisma.customer.createMany(
        {
          data: customersToRestore as never,
          skipDuplicates: true,
        },
      );
      console.log(`Restored ${createdCustomersCount} customers`);
    }
  }

  const discountCodesToRestore = await prismaOld.discountCode.findMany({
    where: { partnerId },
  });
  if (discountCodesToRestore.length > 0) {
    const { count: createdDiscountCodesCount } =
      await prisma.discountCode.createMany({
        data: discountCodesToRestore,
        skipDuplicates: true,
      });
    console.log(`Restored ${createdDiscountCodesCount} discount codes`);

    for (const discountCode of discountCodesToRestore) {
      const workspace = await prisma.project.findUniqueOrThrow({
        where: {
          defaultProgramId: discountCode.programId,
        },
        select: {
          stripeConnectId: true,
        },
      });

      if (!workspace.stripeConnectId) {
        console.log(
          `Workspace for program ${discountCode.programId} not found`,
        );
        continue;
      }

      const promotionCodes = await stripeAppClient({
        mode: "live",
      }).promotionCodes.list(
        {
          code: discountCode.code,
          limit: 1,
        },
        {
          stripeAccount: workspace.stripeConnectId,
        },
      );

      if (promotionCodes.data.length === 0) {
        console.log(`Promotion code ${discountCode.code} not found`);
        continue;
      }

      const promotionCode = promotionCodes.data[0];

      const res = await stripeAppClient({ mode: "live" }).promotionCodes.update(
        promotionCode.id,
        {
          active: true,
        },
        {
          stripeAccount: workspace.stripeConnectId,
        },
      );
      console.log(`Restored promotion code ${JSON.stringify(res, null, 2)}`);
    }
  }
}

main();
