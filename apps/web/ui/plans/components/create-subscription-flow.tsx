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
import { useRouter } from "next/navigation";
import { Dispatch, FC, SetStateAction, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

interface ICreateSubscriptionProps {
  amount: number;
  user: ICustomerBody;
  selectedPlan: IPricingPlan;
  isUpdatingToken: boolean;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
}

const pageName = "account";

export const CreateSubscriptionFlow: FC<Readonly<ICreateSubscriptionProps>> = ({
  amount,
  user,
  selectedPlan,
  isUpdatingToken,
  setIsProcessing,
}) => {
  const router = useRouter();
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
    setIsProcessing(true);

    generateCheckoutFormPaymentEvents({
      user,
      stage: "attempt",
      price: amount,
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
      setIsProcessing(false);
      setIsSubscriptionCreation(false);
      toast.error("Subscription creation failed!");

      return generateCheckoutFormPaymentEvents({
        user,
        data: {
          ...data,
          ...res,
        },
        planCode: selectedPlan.paymentPlan,
        price: amount,
        stage: "error",
        toxic: false,
      });
    }

    toast.success("Subscription created successfully!");

    generateCheckoutFormPaymentEvents({
      user,
      data,
      planCode: selectedPlan.paymentPlan,
      price: amount,
      stage: "success",
      paymentType: data.paymentType,
      subscriptionId: res!.data!.subscriptionId!,
    });

    await updateSession();

    // Force refresh user data cache
    await mutate("/api/user");

    // Force refresh the page cache
    router.refresh();
    router.push("/");
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

    setIsProcessing(false);
    setIsSubscriptionCreation(false);

    generateCheckoutFormPaymentEvents({
      user,
      data: eventData,
      planCode: selectedPlan.paymentPlan,
      price: amount,
      stage: "error",
      toxic: false,
      paymentType: paymentTypeRef.current!,
    });
  };

  return (
    <>
      {isUpdatingToken ? (
        <div className="flex items-center justify-center py-4">
          <Text size="2" className="text-neutral-600">
            Updating payment information...
          </Text>
        </div>
      ) : (
        <CheckoutFormComponent
          locale="en"
          theme="light"
          user={user}
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
