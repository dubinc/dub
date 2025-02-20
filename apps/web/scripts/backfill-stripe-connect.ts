import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripe } from "../lib/stripe";

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      stripeConnectId: null,
      email: {
        not: null,
      },
    },
    take: 5,
    orderBy: {
      createdAt: "asc",
    },
  });

  await Promise.allSettled(
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

      console.log(
        `New Stripe Connect account created for ${partner.name}: ${res.id}`,
      );

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
