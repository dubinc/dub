import { stripe } from "@/lib/stripe";

export const STRIPE_FRAUD_VALUE_LISTS = {
  CUSTOMER_ID: "rsl_1LeVdvAlJJEpqkPVEcNgjxqq",
  CUSTOMER_EMAIL: "rsl_1LeVdvAlJJEpqkPVhZw9Xvgw",
  CARD_FINGERPRINT: "rsl_1LeVdvAlJJEpqkPVvUZUm9eC",
};

export async function addToStripeFraudValueLists({
  customerId,
  customerEmail,
  cardFingerprint,
}: {
  customerId: string;
  customerEmail?: string | null;
  cardFingerprint?: string | null;
}) {
  // add to Stripe Fraud Value Lists
  await Promise.allSettled([
    stripe.radar.valueListItems.create({
      value_list: STRIPE_FRAUD_VALUE_LISTS.CUSTOMER_ID,
      value: customerId,
    }),
    customerEmail
      ? stripe.radar.valueListItems.create({
          value_list: STRIPE_FRAUD_VALUE_LISTS.CUSTOMER_EMAIL,
          value: customerEmail,
        })
      : null,
    cardFingerprint
      ? stripe.radar.valueListItems.create({
          value_list: STRIPE_FRAUD_VALUE_LISTS.CARD_FINGERPRINT,
          value: cardFingerprint,
        })
      : null,
  ]).then((results) => {
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        const listItem = [customerId, customerEmail, cardFingerprint][idx];
        const listName = Object.entries(STRIPE_FRAUD_VALUE_LISTS)[idx][0];
        console.log(
          `Added ${listItem} to ${listName} Fraud Value List: ${JSON.stringify(result.value, null, 2)}`,
        );
      }
    });
  });
}
