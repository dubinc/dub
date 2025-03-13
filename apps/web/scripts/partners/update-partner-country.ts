import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import Stripe from "stripe";

export const stripe = new Stripe(`${process.env.STRIPE_CONNECT_WRITE_KEY}`, {
  apiVersion: "2022-11-15",
  appInfo: {
    name: "Dub.co",
    version: "0.1.0",
  },
});

const email = "xxx";

// update partner country
async function main() {
  const partner = await prisma.partner.update({
    where: {
      email,
    },
    data: {
      country: "US",
    },
  });

  if (partner.stripeConnectId) {
    const res = await stripe.accounts.del(partner.stripeConnectId);
    console.log("res", res);

    if (res.deleted) {
      await prisma.partner.update({
        where: {
          email,
        },
        data: {
          stripeConnectId: null,
        },
      });
    }
  }
}

main();
