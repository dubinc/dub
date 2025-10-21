import { withAdmin } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/refresh-domain
export const POST = withAdmin(async ({ req }) => {
  const { email } = await req.json();

  const partner = await prisma.partner.findUnique({
    where: {
      email,
    },
  });

  if (!partner) {
    return new Response("Partner not found", { status: 404 });
  }

  if (!partner.stripeConnectId) {
    return new Response("Partner has no Stripe express account", {
      status: 400,
    });
  }

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
    const response = await stripe.accounts.del(partner.stripeConnectId);
    // should never happen, but just in case
    if (!response.deleted) {
      return new Response("Stripe account has already been deleted", {
        status: 400,
      });
    }

    await prisma.partner.update({
      where: { id: partner.id },
      data: {
        stripeConnectId: null,
        payoutsEnabledAt: null,
        payoutMethodHash: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new Response(`Failed to delete Stripe express account: ${error}`, {
      status: 400,
    });
  }
});
