import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { stripeConnectClient } from "../stripe/connect-client";

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

  // Queue an index update for the changed country.
  await queuePartnerSearchSync({ partnerIds: [partner.id] });

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
