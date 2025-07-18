import { storage } from "@/lib/storage";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { bulkDeleteLinks } from "../links/bulk-delete-links";

// delete partner and all associated links, customers, payouts, and commissions
// currently only used for the cron/cleanup job
export async function deletePartner({ partnerId }: { partnerId: string }) {
  const partner = await prisma.partner.findUnique({
    where: {
      id: partnerId,
    },
    include: {
      programs: {
        select: {
          links: true,
        },
      },
    },
  });

  if (!partner) {
    console.error(`Partner with id ${partnerId} not found.`);
    return;
  }

  const links = partner.programs.length > 0 ? partner.programs[0].links : [];

  if (links.length > 0) {
    await prisma.customer.deleteMany({
      where: {
        linkId: {
          in: links.map((link) => link.id),
        },
      },
    });

    await bulkDeleteLinks(links);

    await prisma.link.deleteMany({
      where: {
        id: {
          in: links.map((link) => link.id),
        },
      },
    });
  }

  await prisma.commission.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });

  await prisma.payout.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });

  await prisma.partner.delete({
    where: {
      id: partner.id,
    },
  });

  if (partner.stripeConnectId) {
    await stripe.accounts.del(partner.stripeConnectId);
  }

  if (partner.image && partner.image.startsWith(R2_URL)) {
    await storage.delete(partner.image.replace(`${R2_URL}/`, ""));
  }
}
