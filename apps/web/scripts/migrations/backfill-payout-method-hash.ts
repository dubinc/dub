import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripeConnectClient } from "../stripe/connect-client";

async function main() {
  const partnerIdsToSkip: string[] = [];

  const partners = await prisma.partner.findMany({
    where: {
      stripeConnectId: {
        not: null,
      },
      payoutsEnabledAt: {
        not: null,
      },
      payoutMethodHash: null,
    },
    orderBy: {
      payoutsEnabledAt: "asc",
    },
    take: 500,
  });

  for (const partner of partners) {
    const { data: externalAccounts } =
      await stripeConnectClient.accounts.listExternalAccounts(
        partner.stripeConnectId!,
      );

    console.log(
      `Found ${externalAccounts.length} external account for partner ${partner.email}`,
    );

    const defaultExternalAccount = externalAccounts.find(
      (account) => account.default_for_currency,
    );

    if (!defaultExternalAccount) {
      console.log(
        `Expected at least 1 external account for ${partner.email}, none found`,
      );
      continue;
    }

    if (!defaultExternalAccount.fingerprint) {
      console.log(
        `External account ${defaultExternalAccount.id} for ${partner.email} has no fingerprint`,
      );
      partnerIdsToSkip.push(partner.id);
      continue;
    }

    try {
      const updatedRes = await prisma.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          payoutMethodHash: defaultExternalAccount.fingerprint,
        },
      });

      console.log(
        `Updated ${partner.email} with payoutMethodHash ${updatedRes.payoutMethodHash}`,
      );
    } catch (error) {
      if (error.code === "P2002") {
        const duplicateHash = await prisma.partner.findUnique({
          where: {
            payoutMethodHash: defaultExternalAccount.fingerprint!,
          },
        });
        if (duplicateHash) {
          partnerIdsToSkip.push(partner.id);
          console.log(
            `Payout method hash already exists for ${partner.email} / ${partner.stripeConnectId} (found on ${duplicateHash.email} / ${duplicateHash.stripeConnectId})`,
          );
        } else {
          console.log(
            `Payout method hash already exists for ${partner.email} / ${partner.stripeConnectId} but could not find duplicate`,
          );
        }
      } else {
        console.log(`Error updating ${partner.email}: ${error}`);
      }
    }
  }

  console.log(`Partner IDs to skip: "${partnerIdsToSkip.join('", "')}"`);
}

main();
