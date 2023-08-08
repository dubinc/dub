export function getPlanFromPriceId(priceId: string) {
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "production" : "test";
  return PLANS.find(
    (plan) =>
      plan.price.monthly.priceIds[env] === priceId ||
      plan.price.yearly.priceIds[env] === priceId,
  )!;
}

// custom type coercion because Stripe's types are wrong
export function isNewCustomer(
  previousAttributes:
    | {
        default_payment_method?: string;
        items?: {
          data?: {
            price?: {
              id?: string;
            }[];
          };
        };
      }
    | undefined,
) {
  let isNewCustomer = false;
  try {
    if (
      // if the project is upgrading from free to pro
      previousAttributes?.default_payment_method === null
    ) {
      isNewCustomer = true;
    } else {
      // if the project is upgrading from pro to enterprise
      const oldPriceId =
        previousAttributes?.items?.data &&
        previousAttributes?.items?.data[0].price.id;
      if (oldPriceId && getPlanFromPriceId(oldPriceId).slug === "pro") {
        isNewCustomer = true;
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
  return isNewCustomer;
}

export const PLANS = [
  {
    name: "Pro",
    slug: "pro",
    quota: 50000,
    price: {
      monthly: {
        amount: 9,
        priceIds: {
          test: "price_1LoytoAlJJEpqkPV2oPcQ63m",
          production: "price_1LodNLAlJJEpqkPVQSrt33Lc",
        },
      },
      yearly: {
        amount: 90,
        priceIds: {
          test: "price_1LoytoAlJJEpqkPVsWjM4tB9",
          production: "price_1LodNLAlJJEpqkPVRxUyCQgZ",
        },
      },
    },
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    quota: 1000000000, // arbitrary large number to represent unlimited – might need to change this in the future
    price: {
      monthly: {
        amount: 49,
        priceIds: {
          test: "price_1LoyrCAlJJEpqkPVZ32BV3wm",
          production: "price_1LodLoAlJJEpqkPV9rD0rlNL",
        },
      },
      yearly: {
        amount: 490,
        priceIds: {
          test: "price_1LoyrCAlJJEpqkPVgIlNG23q",
          production: "price_1LodLoAlJJEpqkPVJdwv5zrG",
        },
      },
    },
  },
];
