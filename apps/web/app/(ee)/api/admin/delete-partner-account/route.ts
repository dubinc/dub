import { withAdmin } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/delete-partner-account
export const POST = withAdmin(async ({ req }) => {
  const { email } = await req.json();

  const partner = await prisma.partner.findUnique({
    where: {
      email,
    },
    include: {
      commissions: true,
      programs: {
        select: {
          program: true,
          links: true,
        },
      },
    },
  });

  if (!partner) {
    return new Response("Partner not found", { status: 404 });
  }

  if (partner.commissions.length === 0) {
    console.log(
      "Partner has no commissions yet, deleting program links and customers...",
    );
    if (partner.programs.length > 0) {
      for (const { program, links } of partner.programs) {
        if (links.length > 0) {
          await Promise.allSettled([
            prisma.link.deleteMany({
              where: {
                id: {
                  in: links.map((link) => link.id),
                },
              },
            }),
            recordLink(links, { deleted: true }),
            prisma.customer.deleteMany({
              where: {
                linkId: {
                  in: links.map((link) => link.id),
                },
              },
            }),
          ]);
          console.log(
            `Deleted ${links.length} links and it's customers for program ${program.name} (${program.slug})`,
          );
        }
      }
    }

    const deletedPartner = await prisma.partner.delete({
      where: {
        id: partner.id,
      },
    });
    console.log("Deleted partner", deletedPartner);
  } else {
    console.log(
      `Partner has already received ${partner.commissions.length} commissions (total: $${partner.commissions.reduce((acc, commission) => acc + commission.amount, 0)}) and cannot be deleted...`,
    );
  }

  if (partner.stripeConnectId) {
    // check if stripe express account has received payouts before
    const transfers = await stripe.transfers.list({
      destination: partner.stripeConnectId,
      limit: 1,
    });

    if (transfers.data.length > 0) {
      return new Response(
        "Stripe express account has received payouts before and cannot be deleted.",
        {
          status: 400,
        },
      );
    }

    try {
      await stripe.accounts.del(partner.stripeConnectId);
      console.log("Deleted Stripe express account: ", partner.stripeConnectId);
    } catch (error) {}
  }

  return NextResponse.json({ success: true });
});
