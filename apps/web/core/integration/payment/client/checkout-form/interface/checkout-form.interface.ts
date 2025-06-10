import { Payment } from '@primer-io/checkout-web';

export interface ICheckoutFormSuccess {
  payment: Payment;
  paymentType: string;
  paymentMethodType: string;
  paymentProcessor: string;
  currencyCode: string;
  nationalDocumentId?: string;
  first6Digits?: string;
  metadata?: { [key: string]: any };
}

export interface ICheckoutFormError {
  message: string;
  code: string;
  isActive: boolean;
}

export interface IPrimerClientError {
  code: string;
  message: string;
}

export type DeclineReasonKeys =
  | 'INVALID_NATIONAL_ID'
  | 'INSUFFICIENT_FUNDS'
  | 'DO_NOT_HONOR'
  | 'SUSPECTED_FRAUD'
  | 'ERROR'
  | 'UNKNOWN';
