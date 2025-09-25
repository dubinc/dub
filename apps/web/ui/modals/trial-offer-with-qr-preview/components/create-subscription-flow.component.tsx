"use client";

import { LoadingSpinner, Modal } from "@dub/ui";
import { Payment } from "@primer-io/checkout-web";
import { Checkbox } from "@radix-ui/themes";
import { useCreateSubscriptionMutation } from "core/api/user/subscription/subscription.hook";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import {
  CheckoutFormComponent,
  ICheckoutFormSuccess,
  IPrimerClientError,
} from "core/integration/payment/client/checkout-form";
import {
  getCalculatePriceForView,
  getPaymentPlanPrice,
  ICustomerBody,
  TPaymentPlan,
} from "core/integration/payment/config";
import { generateCheckoutFormPaymentEvents } from "core/services/events/checkout-form-events.service.ts";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FC, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface ICreateSubscriptionProps {
  user: ICustomerBody;
}

const pageName = "dashboard";
const trialPaymentPlan: TPaymentPlan = "PRICE_TRIAL_MONTH_PLAN";
const subPaymentPlan: TPaymentPlan = "PRICE_MONTH_PLAN";

export const CreateSubscriptionFlow: FC<Readonly<ICreateSubscriptionProps>> = ({
  user,
}) => {
  const router = useRouter();
  const paymentTypeRef = useRef<string | null>(null);
  const [isSubscriptionCreation, setIsSubscriptionCreation] = useState(false);
  const [isChecked, setIsChecked] = useState(true);

  const { update: updateSession } = useSession();

  const { trigger: triggerCreateSubscription } =
    useCreateSubscriptionMutation();

  const { priceForPay, priceForView } = getPaymentPlanPrice({
    paymentPlan: trialPaymentPlan,
    user,
  });
  const priceForViewText = getCalculatePriceForView(priceForView, user);

  const { priceForView: oldPriceForView } = getPaymentPlanPrice({
    paymentPlan: "PRICE_MONTH_PLAN",
    user,
  });
  const oldPriceForViewText = getCalculatePriceForView(oldPriceForView, user);

  const onPaymentMethodTypeClick = (paymentMethodType: string) => {
    paymentTypeRef.current = paymentMethodType;

    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: pageName,
        content_value: paymentMethodType,
        email: user?.email,
        event_category: "Authorized",
      },
      sessionId: user?.id,
    });
  };

  const onPaymentMethodTypeOpen = (paymentMethodType: string) => {
    paymentTypeRef.current = paymentMethodType;

    if (paymentMethodType.includes("CARD")) {
      return;
    }

    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_OPENED,
      params: {
        page_name: pageName,
        element_name: paymentMethodType,
        email: user?.email,
        event_category: "Authorized",
      },
      sessionId: user?.id,
    });
  };

  const handleOpenCardDetailsForm = () => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: pageName,
        content_value: "card",
        email: user?.email,
        event_category: "Authorized",
      },
      sessionId: user?.id,
    });
    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_OPENED,
      params: {
        page_name: pageName,
        element_name: "CardDetails",
        email: user?.email,
        event_category: "Authorized",
      },
      sessionId: user?.id,
    });
  };

  const onPaymentAttempt = () => {
    generateCheckoutFormPaymentEvents({
      user,
      stage: "attempt",
      price: priceForPay,
      planCode: trialPaymentPlan,
      paymentType: paymentTypeRef.current!,
      toxic: false,
    });
  };

  const handlePaymentSuccess = async (data: ICheckoutFormSuccess) => {
    setIsSubscriptionCreation(true);

    const res = await triggerCreateSubscription({
      payment: {
        id: data.payment.id,
        orderId: data.payment.orderId,
        paymentType: data.paymentType,
        paymentMethodType: data.paymentMethodType,
        paymentProcessor: data.paymentProcessor,
        currencyCode: data.currencyCode,
      },
      nationalDocumentId: data.nationalDocumentId,
      first6Digits: data.first6Digits,
      metadata: { ...data.metadata },
      paymentPlan: data.paymentPlan,
    });

    if (!res?.success) {
      setIsSubscriptionCreation(false);
      toast.error("Subscription creation failed!");

      return generateCheckoutFormPaymentEvents({
        user,
        data: {
          ...data,
          code: "SUBSCRIPTION_CREATION_FAILED",
          message: "Subscription creation failed!",
          ...res,
        },
        planCode: trialPaymentPlan,
        price: priceForPay,
        stage: "error",
        toxic: false,
      });
    }

    toast.success("Subscription created successfully!");

    generateCheckoutFormPaymentEvents({
      user,
      data,
      planCode: trialPaymentPlan,
      price: priceForPay,
      stage: "success",
      paymentType: data.paymentType,
      subscriptionId: res!.data!.subscriptionId!,
      toxic: res?.data?.toxic,
    });

    // Force session update with trigger to refresh user data from DB
    await updateSession();
    await mutate("/api/user");

    router.refresh();

    setTimeout(() => {
      router.push("/account/plans");
    }, 1000);
  };

  const handleCheckoutError = ({
    error,
    data,
  }: {
    error: IPrimerClientError;
    data: { payment?: Payment };
  }) => {
    const eventData = {
      code: error?.code,
      message: error?.message,
      paymentId: data?.payment?.id,
    };

    setIsSubscriptionCreation(false);

    generateCheckoutFormPaymentEvents({
      user,
      data: eventData,
      planCode: trialPaymentPlan,
      price: priceForPay,
      stage: "error",
      toxic: false,
      paymentType: paymentTypeRef.current!,
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-xl bg-white px-0">
          <p className="text-xl font-bold">Total due:</p>
          <div className="flex items-center justify-end gap-2">
            <span className="text-base font-semibold text-slate-400 line-through">
              {oldPriceForViewText}
            </span>
            <span className="text-xl font-bold">{priceForViewText}</span>
          </div>
        </div>
        <CheckoutFormComponent
          locale="en"
          theme="light"
          user={user}
          paymentPlan={trialPaymentPlan}
          onPaymentAttempt={onPaymentAttempt}
          handleCheckoutSuccess={handlePaymentSuccess}
          handleCheckoutError={handleCheckoutError}
          handleOpenCardDetailsForm={handleOpenCardDetailsForm}
          onPaymentMethodSelected={onPaymentMethodTypeClick}
          onBeforePaymentCreate={onPaymentMethodTypeOpen}
          submitBtn={{
            text: "Subscribe",
          }}
        />

        <div className="group flex gap-2">
          <Checkbox
            id="terms-and-conditions"
            checked={isChecked}
            onCheckedChange={(checked) => setIsChecked(checked as boolean)}
          />
          <label
            htmlFor="terms-and-conditions"
            className="select-none text-sm text-xs font-medium text-neutral-500"
          >
            By continuing, you agree to our{" "}
            <Link className="font-semibold underline" href="/eula">
              Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link className="font-semibold underline" href="/privacy-policy">
              Privacy Policy
            </Link>
            . If you don’t cancel at least 24 hours before the end of your 7-day
            trial, your subscription will automatically renew at{" "}
            <span className="font-semibold">
              {oldPriceForViewText} every month until you cancel
            </span>{" "}
            through our Help Center. For assistance, please contact our support
            team at{" "}
            <Link className="font-semibold" href="mailto:help@getqr.com">
              help@getqr.com
            </Link>
          </label>
        </div>
      </div>

      <Modal
        showModal={isSubscriptionCreation}
        preventDefaultClose
        setShowModal={() => setIsSubscriptionCreation(false)}
        className="border-border-500"
      >
        <div className="flex flex-col items-center gap-2 p-4">
          <span className="text-lg font-semibold">
            Your Order Is Being Processed
          </span>
          <LoadingSpinner />
          <span className="text-center">
            Please wait while we finalize your payment and create your digital
            product. Closing this tab may interrupt the process.
          </span>
        </div>
      </Modal>
    </>
  );
};
