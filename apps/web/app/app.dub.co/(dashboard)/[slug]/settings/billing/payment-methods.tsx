"use client";

import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useState } from "react";
import { Stripe } from "stripe";
import { PaymentMethodTypesList } from "./payment-method-types";

export default function PaymentMethods() {
  const { paymentMethods, loading } = usePaymentMethods();

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:p-8 xl:flex-row">
        <div>
          <h2 className="text-xl font-medium">Payment methods</h2>
          <p className="text-balance text-sm leading-normal text-neutral-500">
            Manage your payment methods on Dub
          </p>
        </div>
      </div>
      <div className="grid gap-4 border-t border-neutral-200 p-6">
        {!loading ? (
          ["card", "us_bank_account"].map((methodType) => {
            const paymentMethod = paymentMethods?.find(
              (pm) => pm.type === methodType,
            );

            return (
              <PaymentMethodCard
                key={methodType}
                type={methodType as Stripe.PaymentMethod.Type}
                paymentMethod={paymentMethod}
              />
            );
          })
        ) : (
          <>
            <PaymentMethodCardSkeleton />
            <PaymentMethodCardSkeleton />
          </>
        )}
      </div>
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
          <p className="font-medium text-neutral-900">{title}</p>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
      </div>
      <Button
        variant={paymentMethod ? "secondary" : "primary"}
        className="h-8 w-fit"
        text={paymentMethod ? "Manage" : "Connect"}
        onClick={() => managePaymentMethods(type)}
        loading={isLoading}
      />
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
