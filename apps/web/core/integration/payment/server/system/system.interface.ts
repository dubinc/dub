export interface ISystemUser {
  address?: string;
  country: string;
  email: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  nationalDocumentId?: string;
  timezone?: string;
  attributes?: { [key: string]: string | number | boolean | null };
}

export interface ISystemSubscription {
  plan: {
    chargePeriodDays: number;
    currencyCode: string;
    price: number;
    secondary: boolean;
    trialPeriodDays: number;
    trialPrice: number;
    twoSteps: boolean;
  };
  attributes: { [key: string]: string | number | boolean | null };
}

export interface ICreateSystemTokenOnboardingBody {
  user: ISystemUser;
  subscription: ISystemSubscription;
  orderAmount: number;
  orderCurrencyCode: string;
  orderExternalID: string;
  orderPaymentID: string;
  paymentMethodToken?: string;
}
export interface ICreateSystemTokenOnboardingRes {
  order: {
    amount: number;
    createdAt: string;
    currencyCode: string;
    discountId: number;
    externalId: string;
    id: number;
    oneTimePaymentId: number;
    paymentId: string;
    paymentStatus: string;
    paymentStatusReasonCode: string;
    paymentStatusReasonDeclineType: string;
    paymentType: string;
    subscriptionId: number;
    subscriptionPlanChangeID: number;
    subscriptionUpgradeId: number;
    updatedAt: string;
  };
  subscription: {
    id: string;
    attributes: { [key: string]: string | number | boolean | null };
    cancelReason: string;
    createdAt: string;
    nextBillingDate: string;
    plan: {
      chargePeriodDays: number;
      createdAt: string;
      currencyCode: string;
      delayedCapture: boolean;
      delayedCaptureDays: number;
      delayedCaptureTrialDays: number;
      id: number;
      price: number;
      secondary: boolean;
      trialPeriodDays: number;
      trialPrice: number;
      twoSteps: boolean;
      updatedAt: string;
    };
    status: string;
    updatedAt: string;
    userId: number;
  };
  user: {
    address: string;
    attributes: { [key: string]: string | number | boolean | undefined };
    country: string;
    createdAt: string;
    email: string;
    externalId: string;
    firstName: string;
    id: number;
    lastName: string;
    nationalDocumentId: string;
    timeZone: string;
    updatedAt: string;
  };
}

export interface IUpdateSystemSubscriptionBody {
  discount?: {
    amount: number;
    type: string;
  };
  resetNextBillingDate?: boolean;
  noSubtract: boolean;
  plan: ISystemSubscription["plan"];
  attributes: { [key: string]: string | number | boolean | object | null };
}
export interface IUpdateSystemSubscriptionRes {
  id: string;
  createdAt: string;
  oldPlan: {
    chargePeriodDays: number;
    createdAt: string;
    currencyCode: string;
    delayedCapture: boolean;
    delayedCaptureDays: number;
    delayedCaptureTrialDays: number;
    id: number;
    price: number;
    secondary: boolean;
    trialPeriodDays: number;
    trialPrice: number;
    twoSteps: boolean;
    updatedAt: string;
  };
  plan: {
    chargePeriodDays: number;
    createdAt: string;
    currencyCode: string;
    delayedCapture: boolean;
    delayedCaptureDays: number;
    delayedCaptureTrialDays: number;
    id: number;
    price: number;
    secondary: boolean;
    trialPeriodDays: number;
    trialPrice: number;
    twoSteps: boolean;
    updatedAt: string;
  };
  planCode: string;
  subscriptionId: number;
  success: boolean;
  updatedAt: string;
  upgradeType: string;
}

export interface IGetSystemUserDataBody {
  email: string;
  subscriptionType?: string;
  includeInit?: string;
}
export interface IGetSystemUserDataRes {
  subscriptions: [
    {
      id: string;
      userId: string;
      plan: {
        id: string;
        currencyCode: string;
        price: number;
        chargePeriodDays: number;
        trialPrice: number;
        trialPeriodDays: number;
        secondary: boolean;
        createdAt: string;
        updatedAt: string;
        twoSteps: boolean;
        delayedCapture: string | null;
        delayedCaptureTrialDays: number;
        delayedCaptureDays: number;
      };
      status:
        | "active"
        | "inactive"
        | "trial"
        | "dunning"
        | "pre_active"
        | "pre_renew"
        | "scheduled_for_cancellation"
        | "cancelled";
      nextBillingDate: string;
      createdAt: string;
      updatedAt: string;
      attributes: {
        hostname: string;
        application: string;
        subscriptionType: string;
        plan_name: string;
      };
      cancelReason: string;
    },
  ];
}

export interface ICheckSystemSubscriptionStatusBody {
  email: string;
  subscriptionType?: string;
  includeInit?: string;
}

export interface IGetSystemUpgradePaymentIdRes {
  paymentId: string;
}

export interface IGetSystemPaymentErrorBody {
  id: string;
}
export interface IGetSystemPaymentErrorRes {
  lastPaymentError: {
    date: string;
    declineCode: string;
    declineType: string;
    processorMessage: string;
    type: string;
  };
}

export interface IUpdateSystemPaymentMethodBody {
  orderExternalID: string;
  orderPaymentID: string;
  paymentMethodToken: string;
  subscriptionId: string;
}

export interface IUpdateUserSystemDataBody {
  address?: string;
  country?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  nationalDocumentId?: string;
}

export interface IGetSystemUserProcessorRes {
  metadata: {
    sub_merchant_name?: string;
    sub_processor?: string;
    sub_merchant_id?: string;
    hint_stripe_eu_custom_descriptor?: string;
    hint_stripe_uk_custom_descriptor?: string;
  };
}
