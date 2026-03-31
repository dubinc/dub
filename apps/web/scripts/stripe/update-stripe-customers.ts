import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import Stripe from "stripe";
import { stripeAppClient } from "../../lib/stripe";

async function main() {
  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: "ws_1JRV43Y6B85PGH7B54KA79M81",
    },
  });

  if (!workspace.stripeConnectId) {
    throw new Error("Workspace has no stripeConnectId");
  }

  const customers = await prisma.customer.findMany({
    where: {
      projectId: workspace.id,
      stripeCustomerId: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 20,
  });

  for (const customer of customers) {
    const stripeCustomers = await stripeAppClient({
      mode: "test",
    }).customers.search(
      {
        query: `email:'${customer.email}'`,
      },
      {
        stripeAccount: workspace.stripeConnectId,
      },
    );

    if (stripeCustomers.data.length === 0) {
      console.error(`Stripe search returned no customer for ${customer.email}`);
      continue;
    }

    let stripeCustomer: Stripe.Customer;

    if (stripeCustomers.data.length > 1) {
      // look for the one with metadata.tolt_referral set
      const toltReferralStripeCustomer = stripeCustomers.data.find(
        (customer) => customer.metadata.tolt_referral,
      );

      if (toltReferralStripeCustomer) {
        stripeCustomer = toltReferralStripeCustomer;
      } else {
        console.error(
          `Stripe search returned multiple customers for ${customer.email} and none had metadata.tolt_referral set`,
        );

        continue;
      }
    }

    stripeCustomer = stripeCustomers.data[0];

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        stripeCustomerId: stripeCustomer.id,
      },
    });

    console.log(
      `Updated customer ${customer.email} with stripeCustomerId ${stripeCustomer.id}`,
    );
  }
}

main();
