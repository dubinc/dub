import { withAdmin } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/refresh-domain
export const POST = withAdmin(async ({ req }) => {
  const { email } = await req.json();

  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      email,
    },
  });

  if (!partner.stripeConnectId) {
    return new Response("Partner has no Stripe express account", {
      status: 400,
    });
  }

  const response = await stripe.accounts.del(partner.stripeConnectId);
  if (!response.deleted) {
    return new Response("Failed to delete Stripe express account", {
      status: 500,
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
});
