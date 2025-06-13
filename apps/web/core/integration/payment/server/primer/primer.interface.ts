import { TPaymentPlan } from "../../config";

export interface ICreatePrimerClientSessionBody {
  orderId: string;
  customerId: string;
  currencyCode: string;
  amount: number;
  order: {
    lineItems: { itemId: string; amount: number; quantity: number }[];
    countryCode: string;
  };
  paymentMethod: {
    vaultOnSuccess: boolean;
    vaultOn3DS: boolean;
    paymentType: string;
    orderedAllowedCardNetworks?: string[];
  };
  customer?: {
    emailAddress?: string;
    billingAddress?: { countryCode: string };
    shippingAddress?: { countryCode: string };
  };
  metadata?: { [key: string]: string | number | boolean | null };
}
export interface ICreatePrimerClientSessionRes {
  clientToken: string;
  customerId: string;
  clientTokenExpirationDate: string;
  order: {
    lineItems: { amount: number; productType: string; productData: {} }[];
    countryCode: string;
    retailerCountryCode: string;
    fees: { amount: number }[];
    shipping: {};
  };
  customer: {
    billingAddress: { countryCode: string };
    shippingAddress: { countryCode: string };
  };
  paymentMethod: {
    paymentType: string;
    orderedAllowedCardNetworks: string[];
    options: {
      PAYMENT_CARD: {
        networks: {
          AMEX: { surcharge: {} };
          CARTES_BANCAIRES: { surcharge: {} };
          DANKORT: { surcharge: {} };
          DINERS_CLUB: { surcharge: {} };
          DISCOVER: { surcharge: {} };
          ENROUTE: { surcharge: {} };
          ELO: { surcharge: {} };
          HIPER: { surcharge: {} };
          INTERAC: { surcharge: {} };
          JCB: { surcharge: {} };
          MAESTRO: { surcharge: {} };
          MASTERCARD: { surcharge: {} };
          MIR: { surcharge: {} };
          PRIVATE_LABEL: { surcharge: {} };
          UNIONPAY: { surcharge: {} };
          VISA: { surcharge: {} };
          OTHER: { surcharge: {} };
        };
      };
    };
    authorizationType: string;
  };
  warnings: { type: string; code: string };
}

export interface IUpdatePrimerClientSessionBody
  extends Partial<ICreatePrimerClientSessionBody> {
  clientToken: string;
  paymentPlan: TPaymentPlan;
}
export interface IUpdatePrimerClientSessionRes
  extends ICreatePrimerClientSessionRes {}

export interface IGetPrimerPaymentMethodTokenBody {
  customerId: string;
}

export interface IPrimerPaymentMethod {
  createdAt: string;
  deletedAt?: string;
  deleted: boolean;
  token: string;
  tokenType: string;
  analyticsId: string;
  paymentMethodType: string;
  paymentMethodData: {
    last4Digits: string;
    expirationMonth: string;
    expirationYear: string;
  };
  customerId: string;
  description: string;
  default: boolean;
}

export interface IGetPrimerPaymentMethodTokenRes {
  data: IPrimerPaymentMethod[];
}

export interface ICreatePrimerClientPaymentBody {
  customerId: string;
  orderId: string;
  paymentMethodToken: string;
  currencyCode: string;
  amount: number;
  order: {
    lineItems: {
      amount: number;
      productType?: string;
      description: string;
      quantity: number;
    }[];
    countryCode: string;
  };
  paymentMethod: { paymentType: string };
  customer?: {
    emailAddress?: string;
    billingAddress?: { countryCode: string };
    shippingAddress?: { countryCode: string };
  };
  metadata?: { [key: string]: string | number | boolean | null };
}
export interface ICreatePrimerClientPaymentRes {
  id: string;
  date: string;
  dateUpdated: string;
  status:
    | "PENDING"
    | "FAILED"
    | "AUTHORIZED"
    | "SETTLING"
    | "PARTIALLY_SETTLED"
    | "SETTLED"
    | "DECLINED"
    | "CANCELLED";
  cardTokenType: string;
  orderId: string;
  currencyCode: string;
  amount: number;
  order: {
    lineItems: { amount: number; productType: string; productData: object }[];
    countryCode: string;
    retailerCountryCode: string;
    fees: { amount: number }[];
    shipping: object;
  };
  customerId: string;
  customer: {
    billingAddress: { countryCode: string };
    shippingAddress: { countryCode: string };
  };
  metadata: {
    productId: number;
    merchantId: string;
  };
  paymentMethod: {
    descriptor: string;
    paymentType: string;
    paymentMethodToken: string;
    isVaulted: boolean;
    analyticsId: string;
    paymentMethodType: string;
    paymentMethodData: {
      first6Digits: string;
      last4Digits: string;
      expirationMonth: string;
      expirationYear: string;
      cardholderName: string;
      network: string;
      isNetworkTokenized: boolean;
      binData: {
        network: string;
        issuerCountryCode: string;
        issuerCurrencyCode: string;
        regionalRestriction: string;
        accountNumberType: string;
        accountFundingType: string;
        prepaidReloadableIndicator: string;
        productUsageType: string;
        productCode: string;
        productName: string;
      };
    };
    threeDSecureAuthentication: { responseCode: string; reasonCode: string };
    authorizationType: string;
  };
  processor: {
    name: string;
    processorMerchantId: string;
    amountCaptured: number;
    amountRefunded: number;
  };
  requiredAction: { name: string; description: string };
  statusReason: { type: string; declineType: string; code: string };
  transactions: {
    date: string;
    amount: number;
    currencyCode: string;
    processorMerchantId: string;
    transactionType: string;
    processorTransactionId: string;
    processorName: string;
    processorStatus: string;
    processorStatusReason: { type: string; declineType: string; code: string };
    cardTokenType: string;
  }[];
  riskData: {
    fraudChecks: {
      source: string;
      preAuthorizationResult: string;
      postAuthorizationResult: string;
    };
    cvvCheck: { source: string; result: string };
    avsCheck: {
      source: string;
      result: { streetAddress: string; postalCode: string };
    };
  };
}

export interface IGetPrimerClientPaymentInfoBody {
  paymentId: string;
}
export interface IGetPrimerClientPaymentInfoRes {
  id: string;
  date: string;
  dateUpdated: string;
  amount: number;
  currencyCode: string;
  customerId: string;
  metadata: { [key: string]: string | number | boolean | undefined };
  orderId: string;
  status:
    | "PENDING"
    | "FAILED"
    | "AUTHORIZED"
    | "SETTLING"
    | "PARTIALLY_SETTLED"
    | "SETTLED"
    | "DECLINED"
    | "CANCELLED";
  cardTokenType: string;
  order: {
    countryCode: string;
    lineItems: { itemId: string; amount: number; quantity: number }[];
  };
  customer: {
    emailAddress: string;
    billingAddress: { countryCode: string };
    shippingAddress: { countryCode: string };
  };
  paymentMethod: {
    paymentType: string;
    authorizationType: string;
    paymentMethodToken: string;
    isVaulted: boolean;
    analyticsId: string;
    paymentMethodType: string;
    paymentMethodData: {
      last4Digits: string;
      first6Digits: string;
      expirationMonth: string;
      expirationYear: string;
      cardholderName: string;
      network: "MASTERCARD" | "VISA";
      isNetworkTokenized: boolean;
      binData: {
        network: string;
        issuerCountryCode: string;
        issuerName: string;
        regionalRestriction: string;
        accountNumberType: string;
        accountFundingType: string;
        prepaidReloadableIndicator: string;
        productUsageType: string;
        productCode: string;
        productName: string;
      };
    };
    threeDSecureAuthentication: { responseCode: string };
  };
  processor: {
    name: string;
    processorMerchantId: string;
    amountCaptured: number;
    amountRefunded: number;
  };
  transactions: {
    date: string;
    amount: number;
    currencyCode: string;
    transactionType: string;
    processorTransactionId: string;
    processorName: string;
    processorMerchantId: string;
    processorStatus: string;
    orderId: string;
    cardTokenType: string;
  }[];
  riskData: {
    cvvCheck: { source: string; result: string };
    avsCheck: {
      source: string;
      result: { streetAddress: string; postalCode: string };
    };
  };
  statusReason?: {
    code: string;
    declineType: string;
    message: string;
    type: string;
  };
}
