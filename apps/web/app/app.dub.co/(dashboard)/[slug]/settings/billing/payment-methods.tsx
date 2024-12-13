"use client";

import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Button, TooltipContent } from "@dub/ui";
import { CreditCard } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stripe } from "stripe";
import { PaymentMethodTypesList } from "./payment-method-types";

export default function PaymentMethods() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { slug, stripeId } = useWorkspace();
  const { paymentMethods } = usePaymentMethods();

  const managePaymentMethods = async () => {
    setIsLoading(true);
    const { url } = await fetch(
      `/api/workspaces/${slug}/billing/payment-methods`,
      {
        method: "POST",
      },
    ).then((res) => res.json());

    router.push(url);
    setIsLoading(false);
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:p-8 xl:flex-row">
        <div>
          <h2 className="text-xl font-medium">Payment methods</h2>
          <p className="text-balance text-sm leading-normal text-neutral-500">
            Manage your payment methods on Dub
          </p>
        </div>
        <Button
          variant="secondary"
          text="Manage"
          className="h-8 w-fit"
          disabledTooltip={
            !stripeId && (
              <TooltipContent
                title="You must upgrade to a paid plan to manage your payment methods."
                cta="Upgrade"
                href={`/${slug}/upgrade`}
              />
            )
          }
          onClick={managePaymentMethods}
          loading={isLoading}
        />
      </div>
      <div className="grid gap-4 border-t border-neutral-200 p-6">
        {paymentMethods ? (
          paymentMethods.length > 0 ? (
            paymentMethods.map((paymentMethod) => (
              <PaymentMethodCard
                key={paymentMethod.id}
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
            <PaymentMethodCardSkeleton />
          </>
        )}
      </div>
    </div>
  );
}

const PaymentMethodCard = ({
  paymentMethod,
}: {
  paymentMethod: Stripe.PaymentMethod;
}) => {
  const {
    title,
    icon: Icon,
    iconBgColor,
    description,
  } = PaymentMethodTypesList(paymentMethod).find(
    (method) => method.type === paymentMethod.type,
  ) || PaymentMethodTypesList(paymentMethod)[0];

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
