import { Payment } from "@primer-io/checkout-web";

export interface ICheckoutFormError {
  message: string;
  code: string;
  isActive: boolean;
  paymentId?: string;
}

export interface ICheckoutFormSuccess {
  payment: Payment;
  paymentType: string;
  paymentMethodType: string;
  paymentProcessor: string;
  currencyCode: string;
  nationalDocumentId?: string;
  first6Digits?: string;
}

export type DeclineReasonKeys =
  | "UNKNOWN"
  | "INSUFFICIENT_FUNDS"
  | "INVALID_CARD"
  | "EXPIRED_CARD"
  | "DECLINED"
  | "INVALID_NATIONAL_ID"
  | "CARD_DECLINED"
  | "EXPIRED_PAYMENT_METHOD"
  | "INVALID_CVV"
  | "INVALID_EXPIRY_DATE"
  | "PROCESSING_ERROR";
