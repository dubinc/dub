import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { bulkDeleteLinks } from "../../lib/api/links/bulk-delete-links";
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

  if (partner.programs.length > 0) {
    const programEnrollment = partner.programs[0];

    if (programEnrollment.links.length === 0) {
      throw new Error("Program has no links");
    }

    const links = programEnrollment.links;

    const deleteLinkCaches = await bulkDeleteLinks(links);
    console.log("Deleted link caches", deleteLinkCaches);

    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        linkId: {
          in: links.map((link) => link.id),
        },
      },
    });
    console.log("Deleted customers", deletedCustomers);

    const deletedCommissions = await prisma.commission.deleteMany({
      where: {
        partnerId: partner.id,
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
        id: {
          in: links.map((link) => link.id),
        },
      },
    });
    console.log("Deleted links", deletedLinks);
  }

  const deletedPartner = await prisma.partner.delete({
    where: {
      id: partner.id,
    },
  });
  console.log("Deleted partner", deletedPartner);

  if (partner.stripeConnectId) {
    const res = await stripeConnectClient.accounts.del(partner.stripeConnectId);
    console.log("Deleted Stripe account", partner.stripeConnectId, res);
  }
}

main();
