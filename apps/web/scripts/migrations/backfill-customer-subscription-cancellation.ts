import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripeAppClient } from "../../lib/stripe";

async function main() {
  const stripeCustomers = await prisma.customer.findMany({
    where: {
      AND: [
        {
          stripeCustomerId: {
            not: null,
          },
        },
        {
          stripeCustomerId: {
            notIn: [],
          },
        },
        {
          firstSaleAt: null,
        },
      ],
    },
    take: 20,
  });

  let testModeCustomerIds: string[] = [];

  await Promise.all(
    stripeCustomers.map(async (customer) => {
      try {
        const customerSubscriptions = await stripeAppClient({
          mode: "live",
        }).subscriptions.list(
          {
            customer: customer.stripeCustomerId!,
            status: "all",
          },
          {
            stripeAccount: customer.projectConnectId!,
          },
        );

        if (customerSubscriptions.data.length === 0) {
          console.log(`No subscriptions found for customer ${customer.email}`);
          return;
        }

        const subscription = customerSubscriptions.data[0];

        const data = {
          startDate: new Date(subscription.created * 1000),
          subscriptionCanceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
        };

        console.log({
          email: customer.email,
          ...data,
        });

        await prisma.customer.update({
          where: { id: customer.id },
          data,
        });
      } catch (error) {
        testModeCustomerIds.push(customer.id);
      }
    }),
  );

  console.log(`Test mode customer ids: "${testModeCustomerIds.join('", "')}"`);
}

main();
