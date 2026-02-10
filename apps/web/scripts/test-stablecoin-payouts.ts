import "dotenv-flow/config";

import { createStripeRecipientAccountLink } from "@/lib/stripe/create-stripe-recipient-account-link";

async function main() {
  // await createStripeRecipientAccount({
  //   name: "Kiran",
  //   email: "kiran+3@dub.co",
  //   country: "US",
  //   profileType: "individual",
  // });

  const accountLink = await createStripeRecipientAccountLink({
    partner: {
      id: "pn_xxx",
      stripeRecipientId: "acct_1SzB92AionB5Y24O",
    },
    useCase: "account_onboarding",
  });

  console.log(accountLink);
}

main();
