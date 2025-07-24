import { TPaymentPlan } from "core/integration/payment/config";
import { IDataRes } from "core/interfaces/common.interface.ts";

export interface ICheckSubscriptionStatusRes extends IDataRes {
  data?: { isSubscribed: boolean } | null;
}

export interface ICreateSubscriptionBody {
  payment: {
    orderId: string;
    id: string;
    paymentType?: string;
    paymentMethodType?: string;
    paymentProcessor?: string;
    currencyCode: string;
  };
  nationalDocumentId?: string;
  first6Digits?: string;
  paymentPlan: TPaymentPlan;
  metadata?: { [key: string]: string | number | boolean | undefined };
}
export interface ICreateSubscriptionRes extends IDataRes {
  data?: {
    subscriptionId: string;
    toxic: boolean;
  } | null;
}

export interface IUpdateSubscriptionBody {
  paymentPlan: TPaymentPlan;
}

export interface IUpdateSubscriptionRes extends IDataRes {}

export interface IUpdateSubscriptionPaymentMethodBody {
  email: string;
  customerId: string;
  payment: {
    orderId: string;
    id: string;
    paymentType?: string;
    paymentMethodType?: string;
    paymentProcessor?: string;
    currencyCode: string;
  };
  nationalDocumentId?: string;
  first6Digits?: string;
  metadata?: { [key: string]: string | number | boolean | undefined };
}

export interface IUpdateSubscriptionPaymentMethodRes extends IDataRes {
  data?: { toxic: boolean } | null;
}
