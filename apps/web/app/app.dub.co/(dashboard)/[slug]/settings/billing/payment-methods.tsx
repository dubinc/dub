"use client";

import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import ManageSubscriptionButton from "@/ui/workspaces/manage-subscription-button";
import { Badge, Button, CreditCard } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { Stripe } from "stripe";
import { PaymentMethodTypesList } from "./payment-method-types";

export default function PaymentMethods() {
  const { stripeId, partnersEnabled } = useWorkspace();
  const { paymentMethods } = usePaymentMethods();

  const regularPaymentMethods = paymentMethods?.filter(
    (pm) => pm.type !== "us_bank_account",
  );

  const achPaymentMethods = paymentMethods?.filter(
    (pm) => pm.type === "us_bank_account",
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-center justify-between gap-y-4 p-6 md:p-8 xl:flex-row">
        <div>
          <h2 className="text-xl font-medium">Payment methods</h2>
          <p className="text-balance text-sm leading-normal text-neutral-500">
            Manage your payment methods on Dub
          </p>
        </div>
        {stripeId && (
          <ManageSubscriptionButton text="Manage" className="w-fit" />
        )}
      </div>
      <div className="grid gap-4 border-t border-neutral-200 p-6">
        {regularPaymentMethods ? (
          regularPaymentMethods.length > 0 ? (
            regularPaymentMethods.map((paymentMethod) => (
              <PaymentMethodCard
                key={paymentMethod.id}
                type={paymentMethod.type}
                paymentMethod={paymentMethod}
              />
            ))
          ) : (
            <AnimatedEmptyState
              title="No payment methods found"
              description="You haven't added any payment methods yet"
              cardContent={() => (
                <>
                  <CreditCard className="size-4 text-neutral-700" />
                  <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
                </>
              )}
              className="border-none md:min-h-[250px]"
            />
          )
        ) : (
          <>
            <PaymentMethodCardSkeleton />
            <PaymentMethodCardSkeleton />
          </>
        )}
      </div>
      {partnersEnabled && achPaymentMethods && (
        <div className="grid gap-4 border-t border-neutral-200 p-6">
          {achPaymentMethods.length > 0 ? (
            achPaymentMethods.map((paymentMethod) => (
              <PaymentMethodCard
                key={paymentMethod.id}
                type={paymentMethod.type}
                paymentMethod={paymentMethod}
              />
            ))
          ) : (
            <PaymentMethodCard type="us_bank_account" />
          )}
        </div>
      )}
    </div>
  );
}

const PaymentMethodCard = ({
  type,
  paymentMethod,
}: {
  type: Stripe.PaymentMethod.Type;
  paymentMethod?: Stripe.PaymentMethod;
}) => {
  const { slug } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  const result = PaymentMethodTypesList(paymentMethod);

  const {
    title,
    icon: Icon,
    iconBgColor,
    description,
  } = result.find((method) => method.type === type) || result[0];

  const managePaymentMethods = async (method: string) => {
    setIsLoading(true);
    const { url } = await fetch(
      `/api/workspaces/${slug}/billing/payment-methods`,
      {
        method: "POST",
        body: JSON.stringify({ method }),
      },
    ).then((res) => res.json());

    window.open(url, "_blank");
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-lg bg-neutral-100",
            iconBgColor,
          )}
        >
          <Icon className="size-6 text-neutral-700" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-neutral-900">{title}</p>
            {type === "us_bank_account" && (
              <Badge variant="neutral">
                Recommended for Dub Partners payouts
              </Badge>
            )}
          </div>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
      </div>
      {!paymentMethod && (
        <Button
          variant="primary"
          className="h-8 w-fit"
          text="Connect"
          onClick={() => managePaymentMethods(type)}
          loading={isLoading}
        />
      )}
    </div>
  );
};

const PaymentMethodCardSkeleton = () => {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-4">
        <div className="flex size-12 animate-pulse items-center justify-center rounded-lg bg-neutral-200" />
        <div>
          <div className="h-5 w-24 animate-pulse rounded-md bg-neutral-200" />
          <div className="mt-1 h-4 w-32 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
    </div>
  );
};
