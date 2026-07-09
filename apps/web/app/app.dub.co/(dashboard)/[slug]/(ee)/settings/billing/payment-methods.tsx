"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { DIRECT_DEBIT_PAYMENT_METHOD_TYPES } from "@/lib/constants/payouts";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useWorkspace from "@/lib/swr/use-workspace";
import { useAddPaymentMethodModal } from "@/ui/modals/add-payment-method-modal";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { ThreeDots } from "@/ui/shared/icons";
import {
  Badge,
  Button,
  CreditCard,
  GreekTemple,
  MenuItem,
  MoneyBill2,
  Popover,
} from "@dub/ui";
import { Flag2, LoadingSpinner, Plus, Trash } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Command } from "cmdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Stripe } from "stripe";
import { PaymentMethodTypesList } from "./payment-method-types";

export default function PaymentMethods() {
  const router = useRouter();
  const { paymentMethods, defaultPaymentMethodId } = usePaymentMethods();
  const [isLoading, setIsLoading] = useState(false);
  const { slug, stripeId, role } = useWorkspace();

  const regularPaymentMethods = paymentMethods?.filter(
    (pm) => !DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(pm.type),
  );

  const partnerPaymentMethods = paymentMethods?.filter((pm) =>
    DIRECT_DEBIT_PAYMENT_METHOD_TYPES.includes(pm.type),
  );

  const addPaymentMethod = async () => {
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

  if (!stripeId) {
    return null;
  }

  return (
    <div className="mb-8 rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col items-start justify-between gap-y-4 p-6 md:flex-row md:items-center md:p-8">
        <div>
          <h2 className="text-xl font-medium">Payment methods</h2>
          <p className="text-balance text-sm leading-normal text-neutral-500">
            Manage your payment methods on Dub
          </p>
        </div>
        {stripeId && (
          <Button
            text="Add new method"
            className="h-9 w-fit"
            icon={<Plus className="size-3.5 shrink-0" />}
            onClick={() => addPaymentMethod()}
            loading={isLoading}
            disabledTooltip={
              clientAccessCheck({
                action: "billing.write",
                role,
              }).error
            }
          />
        )}
      </div>
      <div className="grid gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-100 p-6">
        {regularPaymentMethods ? (
          regularPaymentMethods.length > 0 ? (
            regularPaymentMethods.map((paymentMethod) => (
              <PaymentMethodCard
                key={paymentMethod.id}
                type={paymentMethod.type}
                paymentMethod={paymentMethod}
                isDefault={paymentMethod.id === defaultPaymentMethodId}
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
          <PaymentMethodCardSkeleton />
        )}

        {partnerPaymentMethods ? (
          partnerPaymentMethods.length > 0 ? (
            partnerPaymentMethods.map((paymentMethod) => (
              <PaymentMethodCard
                key={paymentMethod.id}
                type={paymentMethod.type}
                paymentMethod={paymentMethod}
                forPayouts={true}
              />
            ))
          ) : (
            <NoPartnerPaymentMethods />
          )
        ) : (
          <PaymentMethodCardSkeleton />
        )}
      </div>
    </div>
  );
}

const PaymentMethodCard = ({
  type,
  paymentMethod,
  forPayouts = false,
  isDefault = false,
}: {
  type: Stripe.PaymentMethod.Type;
  paymentMethod?: Stripe.PaymentMethod;
  forPayouts?: boolean;
  isDefault?: boolean;
}) => {
  const result = PaymentMethodTypesList(paymentMethod);

  const {
    title,
    icon: Icon,
    iconBgColor,
    description,
  } = result.find((method) => method.type === type) || result[0];

  return (
    <>
      <RecommendedForPayoutsWrapper recommended={forPayouts}>
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
                {isDefault && (
                  <Badge className="border-transparent bg-blue-100 text-[0.625rem] text-blue-700">
                    Default
                  </Badge>
                )}
              </div>
              <p className="text-sm text-neutral-500">{description}</p>
            </div>
          </div>
          {paymentMethod && (
            <PaymentMethodActions
              paymentMethod={paymentMethod}
              title={title}
              isDefault={isDefault}
              canSetDefault={!forPayouts}
            />
          )}
        </div>
      </RecommendedForPayoutsWrapper>
    </>
  );
};

const PaymentMethodActions = ({
  paymentMethod,
  title,
  isDefault,
  canSetDefault,
}: {
  paymentMethod: Stripe.PaymentMethod;
  title: string;
  isDefault: boolean;
  canSetDefault: boolean;
}) => {
  const [openPopover, setOpenPopover] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const { slug, role } = useWorkspace();

  const billingWriteError = clientAccessCheck({
    action: "billing.write",
    role,
    customPermissionDescription: "manage payment methods",
  }).error;

  const setDefaultPaymentMethod = async () => {
    setIsSettingDefault(true);

    try {
      const response = await fetch(
        `/api/workspaces/${slug}/billing/payment-methods`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        toast.error(error.message);
        return;
      }

      await mutatePrefix(`/api/workspaces/${slug}/billing/payment-methods`);
      toast.success("Default payment method updated!");
    } finally {
      setIsSettingDefault(false);
    }
  };

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Remove payment method",
    description: isDefault
      ? `Are you sure you want to remove your default ${title} payment method? You will need to add another payment method to continue billing.`
      : `Are you sure you want to remove this ${title} payment method? This action cannot be undone.`,
    confirmText: "Remove",
    confirmVariant: "danger",
    onConfirm: async () => {
      const response = await fetch(
        `/api/workspaces/${slug}/billing/payment-methods`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        toast.error(error.message);
        return;
      }

      await mutatePrefix(`/api/workspaces/${slug}/billing/payment-methods`);
      toast.success("Payment method removed successfully!");
    },
  });

  return (
    <>
      {confirmModal}
      <Popover
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
        align="end"
        content={
          <Command tabIndex={0} loop className="focus:outline-none">
            <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[160px]">
              {canSetDefault && !isDefault && (
                <MenuItem
                  as={Command.Item}
                  icon={isSettingDefault ? LoadingSpinner : Flag2}
                  onSelect={() => {
                    setDefaultPaymentMethod();
                  }}
                  loading={isSettingDefault}
                  disabledTooltip={billingWriteError}
                >
                  Set as default
                </MenuItem>
              )}
              <MenuItem
                as={Command.Item}
                icon={Trash}
                variant="danger"
                onSelect={() => {
                  setOpenPopover(false);
                  setShowConfirmModal(true);
                }}
                disabledTooltip={
                  isDefault
                    ? "Default payment method cannot be removed. Set a new default payment method first before removing."
                    : billingWriteError
                }
              >
                Remove
              </MenuItem>
            </Command.List>
          </Command>
        }
      >
        <Button
          type="button"
          variant="secondary"
          className="h-9 w-fit px-1.5"
          aria-label="Open payment method actions"
          icon={<ThreeDots className="size-3.5 shrink-0" />}
          onClick={() => setOpenPopover(!openPopover)}
        />
      </Popover>
    </>
  );
};

const NoPartnerPaymentMethods = () => {
  const { stripeId } = useWorkspace();
  const { setShowAddPaymentMethodModal, AddPaymentMethodModal } =
    useAddPaymentMethodModal();
  const { role } = useWorkspace();

  if (!stripeId) {
    return null;
  }

  return (
    <>
      {AddPaymentMethodModal}
      <RecommendedForPayoutsWrapper recommended={true}>
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 drop-shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-lg bg-neutral-100",
              )}
            >
              <GreekTemple className="size-6 text-neutral-700" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-neutral-900">Bank account</p>
              </div>
              <p className="text-sm text-neutral-500">Not connected</p>
            </div>
          </div>

          <Button
            variant="primary"
            className="h-9 w-fit"
            text="Connect"
            onClick={() => setShowAddPaymentMethodModal(true)}
            disabledTooltip={
              clientAccessCheck({
                action: "billing.write",
                role,
                customPermissionDescription: "connect payment methods",
              }).error || undefined
            }
          />
        </div>
      </RecommendedForPayoutsWrapper>
    </>
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
          Recommended for partner payouts.{" "}
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
