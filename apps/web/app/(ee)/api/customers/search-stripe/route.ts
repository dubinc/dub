import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripeAppClient } from "@/lib/stripe";
import { StripeCustomerSchema } from "@/lib/zod/schemas/customers";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const stripe = stripeAppClient({
  ...(process.env.VERCEL_ENV && { mode: "live" }),
});

export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const { search } = z
    .object({
      search: z.string(),
    })
    .parse(searchParams);

  if (!workspace.stripeConnectId) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Your workspace isn't connected to Stripe yet. Please install the Stripe integration under /settings/integrations/stripe to proceed.",
    });
  }

  const { data } = await stripe.customers.search(
    {
      query: `email~"${search}"`,
      limit: 100,
      expand: ["data.subscriptions"],
    },
    {
      stripeAccount: workspace.stripeConnectId,
    },
  );

  const existingCustomers = await prisma.customer.findMany({
    where: {
      stripeCustomerId: {
        in: data.map((customer) => customer.id),
      },
      projectId: workspace.id,
    },
    select: {
      id: true,
      stripeCustomerId: true,
    },
  });

  const stripeCustomers = StripeCustomerSchema.array().parse(
    data.map((customer) => ({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      country: customer.address?.country ?? null,
      subscriptions: customer.subscriptions?.data.length ?? 0,
      dubCustomerId:
        existingCustomers.find((c) => c.stripeCustomerId === customer.id)?.id ??
        null,
    })),
  );

  return NextResponse.json(stripeCustomers);
});
