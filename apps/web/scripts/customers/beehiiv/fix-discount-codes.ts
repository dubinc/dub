import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { stripeAppClient } from "../../../lib/stripe";

async function main() {
  const stripeConnectId = "acct_xxx";
  const stripeCouponId = "xxx";
  const stripeApp = stripeAppClient({
    mode: "live",
  });

  const discountCodes = await prisma.discountCode.findMany({
    where: {
      discount: {
        couponId: stripeCouponId,
      },
    },
  });
  console.log(`Found ${discountCodes.length} discount codes`);

  for (let i = 0; i < discountCodes.length; i++) {
    const discountCode = discountCodes[i];
    const { data } = await stripeApp.promotionCodes.list(
      {
        code: discountCode.code,
      },
      {
        stripeAccount: stripeConnectId,
      },
    );
    if (data.length === 0) {
      console.log(`Promotion code ${discountCode.code} not found, skipping...`);
      continue;
    }
    const promotionCode = data[0];
    if (promotionCode.active !== true) {
      console.log(
        `Promotion code ${discountCode.code} is not active, skipping...`,
      );
      continue;
    }
    if (promotionCode.restrictions.first_time_transaction === false) {
      console.log(
        `Promotion code ${discountCode.code} is already not restricted to first time transactions, skipping...`,
      );
      continue;
    }

    console.log(`Processing promotion code ${discountCode.code}...`);

    const res = await stripeApp.promotionCodes.update(
      promotionCode.id,
      {
        active: false,
      },
      {
        stripeAccount: stripeConnectId,
      },
    );
    console.log(`Disabled promotion code ${discountCode.code}: ${res.id}`);

    const res2 = await stripeApp.promotionCodes.create(
      {
        coupon: stripeCouponId,
        code: discountCode.code,
        restrictions: {
          first_time_transaction: false,
        },
      },
      {
        stripeAccount: stripeConnectId,
      },
    );
    console.log(`Recreated promotion code ${discountCode.code}: ${res2.id}`);
  }

  // sleep for 3 seconds
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // recreate the discount codes (since it'll be deleted by promotion_code.updated webhook)
  const { count: createdDiscountCodesCount } =
    await prisma.discountCode.createMany({
      data: discountCodes,
      skipDuplicates: true,
    });
  console.log(`Recreated ${createdDiscountCodesCount} discount codes`);
}

main();
