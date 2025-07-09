"use client";

import { IPricingPlan } from "@/ui/plans/constants";
import { LoadingSpinner, Modal } from "@dub/ui";
import { Payment } from "@primer-io/checkout-web";
import { Text } from "@radix-ui/themes";
import { useCreateSubscriptionMutation } from "core/api/user/subscription/subscription.hook";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import {
  CheckoutFormComponent,
  ICheckoutFormSuccess,
  IPrimerClientError,
} from "core/integration/payment/client/checkout-form";
import { ICustomerBody } from "core/integration/payment/config";
import { generateCheckoutFormPaymentEvents } from "core/services/events/checkout-form-events.service.ts";
import { useSession } from "next-auth/react";
import { FC, useRef, useState } from "react";
import { toast } from "sonner";

interface ICreateSubscriptionProps {
  amount: number;
  cookieUser: ICustomerBody;
  selectedPlan: IPricingPlan;
  checkoutKey: string;
  isUpdatingToken: boolean;
}

const pageName = "profile";

export const CreateSubscriptionFlow: FC<Readonly<ICreateSubscriptionProps>> = ({
  amount,
  cookieUser,
  selectedPlan,
  checkoutKey,
  isUpdatingToken,
}) => {
  const paymentTypeRef = useRef<string | null>(null);
  const [isSubscriptionCreation, setIsSubscriptionCreation] = useState(false);

  const { update: updateSession } = useSession();

  const { trigger: triggerCreateSubscription } =
    useCreateSubscriptionMutation();

  const onPaymentMethodTypeClick = (paymentMethodType: string) => {
    paymentTypeRef.current = paymentMethodType;

    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: pageName,
        content_value: paymentMethodType,
        event_category: "Authorized",
      },
      sessionId: cookieUser.id,
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
        event_category: "Authorized",
      },
      sessionId: cookieUser.id,
    });
  };

  const handleOpenCardDetailsForm = () => {
    trackClientEvents({
      event: EAnalyticEvents.PAGE_CLICKED,
      params: {
        page_name: pageName,
        content_value: "card",
        event_category: "Authorized",
      },
      sessionId: cookieUser.id,
    });
    trackClientEvents({
      event: EAnalyticEvents.ELEMENT_OPENED,
      params: {
        page_name: pageName,
        element_name: "CardDetails",
        event_category: "Authorized",
      },
      sessionId: cookieUser.id,
    });
  };

  const onPaymentAttempt = () => {
    generateCheckoutFormPaymentEvents({
      user: cookieUser!,
      stage: "attempt",
      price: amount,
      flowType: "internal",
      planCode: selectedPlan.paymentPlan,
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
        paymentMethodType: data.paymentMethodType,
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
        user: cookieUser!,
        data: {
          ...data,
          ...res,
        },
        flowType: "internal",
        planCode: selectedPlan.paymentPlan,
        price: amount,
        stage: "error",
        toxic: false,
      });
    }

    toast.success("Subscription created successfully!");

    generateCheckoutFormPaymentEvents({
      user: cookieUser!,
      data,
      flowType: "internal",
      planCode: selectedPlan.paymentPlan,
      price: amount,
      stage: "success",
      paymentType: data.paymentType,
      subscriptionId: res!.data!.subscriptionId!,
    });

    await updateSession();

    setTimeout(() => window.location.reload(), 1000);
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
      user: cookieUser!,
      data: eventData,
      flowType: "internal",
      planCode: selectedPlan.paymentPlan,
      price: amount,
      stage: "error",
      toxic: false,
      paymentType: paymentTypeRef.current!,
    });
  };

  return (
    <>
      {!isUpdatingToken && (
        <CheckoutFormComponent
          key={checkoutKey}
          locale="en"
          theme="light"
          user={cookieUser}
          paymentPlan={selectedPlan.paymentPlan}
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
      )}
      {isUpdatingToken && (
        <div className="flex items-center justify-center py-4">
          <Text size="2" className="text-neutral-600">
            Updating payment information...
          </Text>
        </div>
      )}
      <Modal
        showModal={isSubscriptionCreation}
        preventDefaultClose
        setShowModal={() => setIsSubscriptionCreation(false)}
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
