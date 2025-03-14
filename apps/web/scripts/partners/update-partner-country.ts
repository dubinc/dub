import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripeConnectClient } from "./stripe";

const email = "xxx";

// update partner country
async function main() {
  const partner = await prisma.partner.update({
    where: {
      email,
    },
    data: {
      country: "US",
      profileType: "company",
    },
  });

  if (partner.stripeConnectId) {
    console.log("deleting stripe connect account");
    const res = await stripeConnectClient.accounts.del(partner.stripeConnectId);
    console.log("res", res);

    if (res.deleted) {
      await prisma.partner.update({
        where: {
          email,
        },
        data: {
          stripeConnectId: null,
          payoutsEnabledAt: null,
        },
      });
    }
  }
}

main();
