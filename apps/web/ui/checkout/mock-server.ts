// Mock server

export async function updatePrimerClientSession({
  clientToken,
  currencyCode,
  amount,
  order,
}: {
  clientToken: string;
  currencyCode: string;
  amount: number;
  order: {
    lineItems: Array<{ itemId: string; amount: number; quantity: number }>;
    countryCode: string;
  };
}) {
  console.log("Updating Primer client session:", {
    clientToken,
    currencyCode,
    amount,
    order,
  });

  return Promise.resolve({ success: true });
}

export async function getPrimerPaymentInfo({
  paymentId,
}: {
  paymentId: string;
}) {
  console.log("Getting Primer payment info for:", paymentId);

  return {
    paymentMethod: {
      paymentMethodType: "PAYMENT_CARD",
      paymentMethodData: {
        network: "VISA",
        first6Digits: "424242",
      },
    },
    processor: {
      name: "STRIPE",
    },
    currencyCode: "USD",
  };
}

export async function getSystemPaymentError({ id }: { id: string }) {
  console.log("Getting system payment error for:", id);

  return {
    lastPaymentError: {
      processorMessage: "Payment declined",
      declineCode: "INSUFFICIENT_FUNDS",
    },
  };
}
