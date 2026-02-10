import "dotenv-flow/config";

import { createStripeRecipientAccount } from "@/lib/stripe/create-stripe-recipient-account";

async function main() {
  await createStripeRecipientAccount({
    name: "Kiran",
    email: "kiran+3@dub.co",
    country: "US",
    profileType: "individual",
  });
}

main();
