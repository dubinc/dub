import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripe } from "./stripe-init";

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      country: "US",
      stripeConnectId: null,
    },
    take: 5,
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(partners);

  await Promise.all(
    partners.map(async (partner) => {
      const [firstName, lastName] = partner.name.split(" ");
      const res = await stripe.accounts.create({
        type: "express",
        business_type: "individual",
        email: partner.email!,
        country: partner.country!,
        individual: {
          first_name: firstName,
          last_name: lastName,
          email: partner.email!,
        },
        capabilities: {
          transfers: {
            requested: true,
          },
          ...(partner.country === "US" && {
            card_payments: {
              requested: true,
            },
          }),
        },
        ...(partner.country !== "US" && {
          tos_acceptance: { service_agreement: "recipient" },
        }),
      });

      console.log("new stripe connect account created, ", res.id);

      await prisma.partner.update({
        where: {
          id: partner.id,
        },
        data: {
          stripeConnectId: res.id,
        },
      });
    }),
  );
}

main();
