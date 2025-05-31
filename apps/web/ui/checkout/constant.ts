export const checkoutFormStyles = {
  input: {
    base: {
      borderColor: "#e2e8f0",
      borderRadius: "6px",
      fontSize: "16px",
      padding: "12px",
    },
  },
};

export const declineReasons = {
  UNKNOWN:
    "Payment failed. Please try again or use a different payment method.",
  INSUFFICIENT_FUNDS:
    "Insufficient funds. Please use a different payment method.",
  INVALID_CARD: "Invalid card details. Please check and try again.",
  EXPIRED_CARD: "Card has expired. Please use a different card.",
  DECLINED:
    "Payment was declined. Please contact your bank or use a different payment method.",
  INVALID_NATIONAL_ID: "Invalid national ID. Please check and try again.",
  CARD_DECLINED: "Card was declined. Please try a different payment method.",
  EXPIRED_PAYMENT_METHOD:
    "Payment method has expired. Please update your payment information.",
  INVALID_CVV: "Invalid CVV. Please check your card details and try again.",
  INVALID_EXPIRY_DATE:
    "Invalid expiry date. Please check your card details and try again.",
  PROCESSING_ERROR: "Processing error occurred. Please try again.",
};
