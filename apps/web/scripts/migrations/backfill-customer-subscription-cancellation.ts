import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { stripeAppClient } from "../../lib/stripe";

async function main() {
  let page = 0;
  const pageSize = 5000;

  while (true) {
    const stripeCustomers = await prisma.customer.findMany({
      where: {
        stripeCustomerId: {
          not: null,
        },
        firstSaleAt: null,
      },
      take: pageSize,
      skip: page * pageSize,
    });

    if (stripeCustomers.length === 0) {
      console.log("No customers left to backfill");
      break;
    }

    const chunks = chunk(stripeCustomers, 20);
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (customer) => {
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
              console.log(
                `No subscriptions found for customer ${customer.email}`,
              );
              return;
            }

            const subscription = customerSubscriptions.data[0];

            const updatedCustomer = await prisma.customer.update({
              where: { id: customer.id },
              data: {
                firstSaleAt: new Date(subscription.created * 1000),
                subscriptionCanceledAt: subscription.canceled_at
                  ? new Date(subscription.canceled_at * 1000)
                  : null,
              },
            });
            console.log({
              email: updatedCustomer.email,
              firstSaleAt: updatedCustomer.firstSaleAt,
              subscriptionCanceledAt: updatedCustomer.subscriptionCanceledAt,
            });
          } catch (error) {
            console.log(
              `Test mode customer detected: ${customer.stripeCustomerId}`,
            );
          }
        }),
      );
    }

    page++;
  }
}

main();
