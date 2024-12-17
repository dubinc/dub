import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { stripe } from "./stripe-init";

const partnerId = "pn_NNG3YjwhLhA7nCZSaXeLIsWu";

async function main() {
  const partner = await prisma.partner.findUnique({
    where: {
      id: partnerId,
    },
  });
  if (!partner) {
    console.log("Partner not found");
    return;
  }

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

  console.log(res);

  await prisma.partner.update({
    where: {
      id: partnerId,
    },
    data: {
      stripeConnectId: res.id,
    },
  });
}

main();
