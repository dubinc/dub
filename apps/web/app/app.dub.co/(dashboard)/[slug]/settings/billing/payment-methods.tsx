"use client";

import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useWorkspace from "@/lib/swr/use-workspace";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { Badge, Button, CreditCard, MoneyBill2 } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stripe } from "stripe";
import { PaymentMethodTypesList } from "./payment-method-types";

export default function PaymentMethods() {
  const router = useRouter();
  const { slug, stripeId, partnersEnabled, plan } = useWorkspace();
  const { paymentMethods } = usePaymentMethods();

  const regularPaymentMethods = paymentMethods?.filter(
    (pm) => pm.type !== "us_bank_account",
  );

  const achPaymentMethods = paymentMethods?.filter(
    (pm) => pm.type === "us_bank_account",
  );

  const [isLoading, setIsLoading] = useState(false);

  const managePaymentMethods = async () => {
    setIsLoading(true);
    const { url } = await fetch(
      `/api/workspaces/${slug}/billing/payment-methods`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ).then((res) => res.json());

    router.push(url);
  };

  if (plan === "free") {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:flex-row md:items-center md:p-8">
        <div>
          <h2 className="text-xl font-medium">Payment methods</h2>
          <p className="text-balance text-sm leading-normal text-neutral-500">
            Manage your payment methods on Dub
          </p>
        </div>
        {stripeId && (
          <Button
            variant="secondary"
            text="Manage"
            className="h-9 w-fit"
            onClick={() => managePaymentMethods()}
            loading={isLoading}
          />
        )}
      </div>
      <div className="grid gap-4 border-t border-neutral-200 bg-neutral-100 p-6">
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
        {partnersEnabled && (
          <>
            {achPaymentMethods && achPaymentMethods.length > 0 ? (
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
  const router = useRouter();
  const { slug } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  const result = PaymentMethodTypesList(paymentMethod);

  const {
    title,
    icon: Icon,
    iconBgColor,
    description,
  } = result.find((method) => method.type === type) || result[0];

  const addPaymentMethod = async (method: string) => {
    setIsLoading(true);
    const { url } = await fetch(
      `/api/workspaces/${slug}/billing/payment-methods`,
      {
        method: "POST",
        body: JSON.stringify({ method }),
      },
    ).then((res) => res.json());

    router.push(url);
  };

  return (
    <RecommendedForPayoutsWrapper recommended={type === "us_bank_account"}>
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 drop-shadow-sm">
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
              {paymentMethod &&
                (type === "us_bank_account" || paymentMethod.link?.email) && (
                  <Badge className="border-transparent bg-green-200 text-[0.625rem] text-green-900">
                    Connected
                  </Badge>
                )}
            </div>
            <p className="text-sm text-neutral-500">{description}</p>
          </div>
        </div>
        {!paymentMethod && (
          <Button
            variant="primary"
            className="h-9 w-fit"
            text="Connect"
            onClick={() => addPaymentMethod(type)}
            loading={isLoading}
          />
        )}
      </div>
    </RecommendedForPayoutsWrapper>
  );
};

const RecommendedForPayoutsWrapper = ({
  recommended,
  children,
}: {
  recommended: boolean;
  children: React.ReactNode;
}) => {
  return recommended ? (
    <div className="rounded-[0.75rem] bg-neutral-200 p-1">
      {children}
      <span className="flex items-center gap-2 px-3 pb-1 pt-1.5 text-xs text-neutral-800">
        <MoneyBill2 className="size-3.5 shrink-0" />
        <span>
          Recommended for Dub Partner payouts.{" "}
          <Link
            href="https://dub.co/help/article/how-to-set-up-bank-account"
            target="_blank"
            className="underline underline-offset-2 transition-colors duration-75 hover:text-neutral-900"
          >
            Learn more
          </Link>
        </span>
      </span>
    </div>
  ) : (
    children
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
