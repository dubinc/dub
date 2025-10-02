import { DeclineReasonKeys } from "../interface";

// checkout form error
export const declineReasons: Record<DeclineReasonKeys, string> = {
  INVALID_NATIONAL_ID: "Please enter a valid national ID.",
  INSUFFICIENT_FUNDS:
    "Your payment could not be processed due to insufficient funds. Please ensure your account has adequate funds or try again with a different payment method. Please note that we do not accept prepaid or Discover cards.",
  DO_NOT_HONOR:
    "Your payment was not authorized. Please try again with a different payment method or contact your card issuer for more information.",
  SUSPECTED_FRAUD:
    "The transaction was declined. Please try again with a different payment method or contact your card issuer for more information.",
  ERROR:
    "We encountered an issue processing your payment. Please note that we do not accept prepaid or Discover cards. Please try again with a valid Visa, Mastercard, or American Express card. If this issue continues, consider using a different payment method or contact our support.",
  UNKNOWN:
    "Please check your payment information and try again or try a new payment method. Kindly note that we currently do not accept prepaid or Discover cards.",
};

// checkout form styles
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
      borderColor: "#FFFFFF",
      focus: {
        background: "#F6F6F6",
        borderColor: "#0d766e",
      },
    },
    error: {
      background: "#F6F6F6",
      focus: {
        background: "#F6F6F6",
      },
    },
  },
  inputErrorText: {
    fontFamily: "SF Pro Text, system-ui, sans-serif",
    fontSize: "12px",
    color: "#FF4D2B",
    fontWeight: "400",
    lineHeight: "16px",
  },
  submitButton: {
    base: {
      color: "#ffffff",
      background: "#0d766e",
      borderRadius: "8px",
      fontFamily: "SF Pro Text, system-ui, sans-serif",
      fontWeight: "bold",
      boxShadow: "none",
      fontSize: "18px",
    },
    loading: {
      color: "#ffffff",
      background: "#0d766e",
    },
    disabled: {
      color: "#ffffff",
      background: "#0d766e",
    },
  },
};
