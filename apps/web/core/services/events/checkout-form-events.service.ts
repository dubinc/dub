import { trackClientEvents } from "../../integration/analytic";
import { EAnalyticEvents } from "../../integration/analytic/interfaces/analytic.interface.ts";
import {
  ICheckoutFormSuccess,
  IPrimerClientError,
} from "../../integration/payment/client";
import { ICustomerBody, TPaymentPlan } from "../../integration/payment/config";

type TPrimerClientErrorData = IPrimerClientError & { paymentId?: string };

interface ICheckoutFormEventProps {
  user: ICustomerBody;
  data?: ICheckoutFormSuccess | TPrimerClientErrorData;
  price: number;
  planCode: TPaymentPlan;
  stage: "attempt" | "success" | "error";
  subscriptionId?: string | null;
  toxic?: boolean;
  paymentType?: string;
  additionalParams?: {
    [key: string]: string | null;
  };
}

export const generateCheckoutFormPaymentEvents = ({
  user,
  data,
  planCode,
  price,
  stage,
  subscriptionId = null,
  toxic = false,
  paymentType,
  additionalParams,
}: ICheckoutFormEventProps) => {
  const baseParams = {
    amount: price,
    currency:
      stage === "success" && data && "currencyCode" in data
        ? (data as ICheckoutFormSuccess).currencyCode
        : user?.currency?.currencyForPay ?? "",
    email: user.email,
    customer_id: user.id,
    mixpanel_user_id: user.id,
    country: user.currency?.countryCode,
    flow_type: "internal",
    payment_subtype: "FIRST_PAYMENT",
    plan_name: planCode,
    subscription_id: subscriptionId,
    event_category: "Authorized",
    toxic,
    page_name: "profile",
    ...additionalParams,
  };

  if (stage === "attempt") {
    const params = {
      ...baseParams,
      payment_id: null,
      payment_type: paymentType || "PAYMENT_CARD",
      payment_method: null,
      payment_processor: null,
      error_code: null,
    };

    return trackClientEvents({
      event: EAnalyticEvents.PURCHASE_ATTEMPT,
      user,
      params,
    });
  }

  if (stage === "success" && data) {
    const successData = data as ICheckoutFormSuccess;
    const params = {
      ...baseParams,
      payment_id: successData.payment.id,
      payment_type: successData.paymentType,
      payment_method: successData.paymentMethodType,
      payment_processor: successData.paymentProcessor,
      error_code: null,
    };

    return trackClientEvents({
      event: EAnalyticEvents.PURCHASE_SUCCESS,
      user,
      params,
    });
  }

  if (stage === "error" && data) {
    const errorData = data as TPrimerClientErrorData;

    const params = {
      ...baseParams,
      payment_id: errorData.paymentId || null,
      payment_type: paymentType || null,
      error_code: errorData.code || null,
      error_message: errorData.message ?? null,
    };

    return trackClientEvents({
      event: EAnalyticEvents.PURCHASE_ERROR,
      user,
      params,
    });
  }

  throw new Error(`Unknown stage or missing data for stage: ${stage}`);
};
