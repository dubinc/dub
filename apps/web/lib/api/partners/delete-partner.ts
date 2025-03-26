import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { bulkDeleteLinks } from "../links/bulk-delete-links";

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

  const links = partner.programs[0].links;

  await prisma.customer.deleteMany({
    where: {
      linkId: {
        in: links.map((link) => link.id),
      },
    },
  });

  await prisma.payout.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });

  await prisma.commission.deleteMany({
    where: {
      partnerId: partner.id,
    },
  });

  await prisma.link.deleteMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
  });

  await prisma.partner.delete({
    where: {
      id: partner.id,
    },
  });

  await bulkDeleteLinks(links);

  if (partner.stripeConnectId) {
    await stripe.accounts.del(partner.stripeConnectId);
  }
}
