export const checkoutFormStyles = {
  formSpacings: {
    betweenLabelAndInput: "0px",
    betweenInputs: "6px",
  },
  paymentMethodButton: {
    borderRadius: "8px",
  },
  input: {
    base: {
      fontFamily: "SF Pro Text, system-ui, sans-serif",
      height: "48px",
      borderRadius: "8px",
      lineHeight: "48px",
      color: "#525252",
      borderColor: "#E5E5E5",
      focus: {
        background: "#FAFAFA",
        borderColor: "#0066CC",
      },
    },
    error: {
      background: "#FAFAFA",
      focus: {
        background: "#FAFAFA",
      },
    },
  },
  inputErrorText: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "12px",
    color: "#dc2626",
    fontWeight: "400",
    lineHeight: "16px",
  },
  submitButton: {
    base: {
      color: "#ffffff",
      background: "#006666",
      borderRadius: "8px",
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: "bold",
      boxShadow: "none",
      fontSize: "16px",
    },
    loading: {
      color: "#ffffff",
      background: "#006666",
    },
    disabled: {
      color: "#ffffff",
      background: "#006666",
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
