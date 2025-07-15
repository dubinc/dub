import { trackClientEvents } from "../../integration/analytic";
import {
  EAnalyticEvents,
  IPurchaseErrorEvent,
  IPurchaseEventTracking,
} from "../../integration/analytic/interfaces/analytic.interface.ts";
import {
  getPaymentPlanPrice,
  ICustomerBody,
  TPaymentPlan,
} from "../../integration/payment/config";

interface Props {
  user: ICustomerBody;
  paymentPlan: TPaymentPlan;
  stage: "attempt" | "success" | "error";
  additionalParams?: { [key: string]: string | number | null };
  paymentId?: string;
}

export const generateTrackingUpsellEvent = ({
  user,
  paymentPlan,
  stage,
  additionalParams,
  paymentId,
}: Props) => {
  const { priceForPay } = getPaymentPlanPrice({ paymentPlan, user });

  const params = {
    error_code: null,
    amount: priceForPay,
    currency: user?.currency?.currencyForPay ?? null,
    email: user?.email ?? null,
    customer_id: user?.paymentInfo?.customerId || null,
    flow_type: "internal",
    mixpanel_user_id: user?.id,
    payment_plan: paymentPlan,
    payment_id: paymentId ?? null,
    payment_type: user?.paymentInfo?.paymentType ?? null,
    payment_method: user?.paymentInfo?.paymentMethodType ?? null,
    payment_processor: user?.paymentInfo?.paymentProcessor ?? null,
    subscription_id: user?.paymentInfo?.subscriptionId ?? null,
    country: user?.currency?.countryCode,
    event_category: "Authorized",
    ...additionalParams,
  };

  if (stage === "attempt") {
    trackClientEvents<IPurchaseEventTracking>({
      event: EAnalyticEvents.PURCHASE_ATTEMPT,
      user,
      params,
    });
  }

  if (stage === "success") {
    trackClientEvents<IPurchaseEventTracking>({
      event: EAnalyticEvents.PURCHASE_SUCCESS,
      user,
      params,
    });
  }

  if (stage === "error") {
    trackClientEvents<IPurchaseErrorEvent>({
      event: EAnalyticEvents.PURCHASE_ERROR,
      user,
      params,
    });
  }
};
