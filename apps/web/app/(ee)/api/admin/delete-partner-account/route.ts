import { withAdmin } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { prettyPrint } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/admin/delete-partner-account
export const POST = withAdmin(async ({ req }) => {
  const { email, deletePartnerAccount } = await req.json();

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
          groupId: true,
        },
      },
    },
  });

  if (!partner) {
    return new Response("Partner not found", { status: 404 });
  }

  if (partner.stripeConnectId) {
    try {
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

      const res = await stripe.accounts.del(partner.stripeConnectId);
      console.log(
        `Deleted Stripe express account for partner ${partner.email}: `,
        prettyPrint(res),
      );
    } catch (error) {
      console.log(
        "Error deleting Stripe express account (probably already deleted): ",
        error,
      );
    }

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        stripeConnectId: null,
        payoutsEnabledAt: null,
        payoutMethodHash: null,
      },
    });
    console.log(`Updated partner ${partner.email} with stripeConnectId null`);
  }

  if (deletePartnerAccount) {
    if (partner.commissions.length > 0) {
      return new Response(
        "Partner has already received commissions and cannot be deleted.",
        {
          status: 400,
        },
      );
    }
    if (
      partner.programs.some(({ links }) => links.some((link) => link.leads > 0))
    ) {
      return new Response(
        "Partner has already received leads and cannot be deleted.",
        {
          status: 400,
        },
      );
    }

    if (partner.programs.length > 0) {
      for (const { program, links, groupId } of partner.programs) {
        if (links.length > 0) {
          await Promise.allSettled([
            prisma.link.deleteMany({
              where: {
                id: {
                  in: links.map((link) => link.id),
                },
              },
            }),
            recordLink(
              links.map((link) => ({
                ...link,
                programEnrollment: { groupId },
              })),
              { deleted: true },
            ),
          ]);
          console.log(
            `Deleted ${links.length} links for program ${program.name} (${program.slug})`,
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
  }

  return NextResponse.json({ success: true });
});
