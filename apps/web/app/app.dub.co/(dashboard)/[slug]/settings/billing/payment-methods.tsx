"use client";

import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { CreditCard, GreekTemple, StripeLink } from "@dub/ui/icons";
import { cn, fetcher } from "@dub/utils";
import { useParams } from "next/navigation";
import { Stripe } from "stripe";
import useSWR from "swr";

export default function PaymentMethods() {
  const { slug } = useParams();
  const { data: paymentMethods } = useSWR<Stripe.PaymentMethod[]>(
    `/api/workspaces/${slug}/billing/payment-methods`,
    fetcher,
  );

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

const PaymentMethodsDetails = (paymentMethod: Stripe.PaymentMethod) =>
  [
    {
      type: "card",
      title: "Card",
      icon: CreditCard,
      description: paymentMethod.card
        ? `Connected ${paymentMethod.card.brand} ***${paymentMethod.card.last4}`
        : "No card connected",
    },
    {
      type: "us_bank_account",
      title: "ACH Debit",
      icon: GreekTemple,
      description: paymentMethod.us_bank_account
        ? `Connected ${paymentMethod.us_bank_account.account_holder_type} account ending in ${paymentMethod.us_bank_account.last4}`
        : "No ACH Debit connected",
    },
    {
      type: "link",
      title: "Link",
      icon: StripeLink,
      iconBgColor: "bg-green-100",
      description: `Connected Link account ${paymentMethod.link?.email}`,
    },
  ] satisfies {
    type: Stripe.PaymentMethod.Type;
    title: string;
    icon: React.ElementType;
    description: string;
    iconBgColor?: string;
  }[];

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
  } = PaymentMethodsDetails(paymentMethod).find(
    (method) => method.type === paymentMethod.type,
  ) || PaymentMethodsDetails(paymentMethod)[0];

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-lg",
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
