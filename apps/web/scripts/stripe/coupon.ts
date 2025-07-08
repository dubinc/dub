import { stripeAppClient } from "@/lib/stripe";
import "dotenv-flow/config";

// Just for testing purposes
async function main() {
  const stripeApp = stripeAppClient({
    livemode: false,
  });

  const stripeAccount = "acct_1RiZ6DDixECvUM5P";

  // // Create a coupon
  const coupon = await stripeApp.coupons.create(
    {
      name: "Coupon 1",
      percent_off: 30,
      duration: "repeating",
      duration_in_months: 12,
    },
    {
      stripeAccount,
    },
  );

  console.log(coupon);

  // // List all coupons
  const coupons = await stripeApp.coupons.list({
    stripeAccount,
  });

  console.log(coupons);

  // Create a promotion code
  const promotionCode = await stripeApp.promotionCodes.create(
    {
      coupon: "msvkvUlA",
      code: "WELCOME",
      metadata: {
        partnerId: "123",
      },
    },
    {
      stripeAccount,
    },
  );

  console.log(promotionCode);

  // List all promotion codes
  const promotionCodes = await stripeApp.promotionCodes.list({
    stripeAccount,
  });

  console.log(promotionCodes);
}

main();
