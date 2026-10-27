export const checkPaymentMethodMandate = async ({
  paymentMethodId,
}: {
  paymentMethodId: string;
}) => {
  // Check mandate via REST API (mandates require Stripe-Version 2025-12-15.preview)
  // TODO: Update this to use the Stripe SDK when we upgrade to the new API version
  const mandatesResponse = await fetch(
    `https://api.stripe.com/v1/mandates?payment_method=${encodeURIComponent(paymentMethodId)}&status=active`,
    {
      method: "GET",
      headers: {
        "Stripe-Version": "2025-12-15.preview",
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    },
  );

  if (!mandatesResponse.ok) {
    const errText = await mandatesResponse.text();
    throw new Error(`Failed to verify mandate: ${errText}`);
  }

  const { data: mandatesData } = await mandatesResponse.json();
  if (!mandatesData || mandatesData.length === 0) {
    return null;
  }

  return mandatesData[0];
};
