import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { DIRECT_DEBIT_PAYMENT_TYPES_INFO, PAYMENT_METHOD_TYPES } from "@/lib/partners/constants";
import { APP_DOMAIN } from "@dub/utils";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

async function main() {
  // const method = "sepa_debit";

  // const paymentMethodOption = DIRECT_DEBIT_PAYMENT_TYPES_INFO.find(
  //   (type) => type.type === method,
  // )?.option;

  // const { url } = await stripe.checkout.sessions.create({
  //   mode: "setup",
  //   customer: "cus_SOsPjGOsIFVEcd",
  //   payment_method_types: [
  //     method as Stripe.Checkout.SessionCreateParams.PaymentMethodType,
  //   ],
  //   payment_method_options: {
  //     [method]: paymentMethodOption,
  //   },
  //   currency: "usd",
  //   success_url: `${APP_DOMAIN}/acme/settings/billing`,
  //   cancel_url: `${APP_DOMAIN}/acme/settings/billing`,
  // });

  // console.log(url);

//  const response = await stripe.paymentIntents.create({
//     amount: 50000,
//     customer: "cus_SOsPjGOsIFVEcd",
//     payment_method_types: ["sepa_debit"],
//     payment_method: "pm_1RdacNAlJJEpqkPV5e1qVEqN",
//     currency: "eur",
//     confirmation_method: "automatic",
//     confirm: true,
//     transfer_group: "inv_123455",
//     statement_descriptor: "Dub Partners",
//     description: `Dub Partners payout invoice (123)`,
//   });

//   console.log(response);

  const transfer = await stripe.transfers.create(
    {
      amount: 10000,
      currency: "usd",
      transfer_group: "inv_123455",
      destination: "acct_1QWV1RPPxgnqIfPu",
      description: `Dub Partners payout (123)`,
      // source_transaction: "py_3RdawSAlJJEpqkPV1VFv5n4z",
      // source_type: "bank_account"
    }
  );

  console.log(transfer);
}

main();
