"use client";

import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import { generateStripeAccountLink } from "@/lib/actions/partners/generate-stripe-account-link";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProps } from "@/lib/types";
import {
  Button,
  MatrixLines,
  Paypal,
  Popover,
  Stripe as StripeIcon,
} from "@dub/ui";
import {
  cn,
  CONNECT_SUPPORTED_COUNTRIES,
  fetcher,
  PAYPAL_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { Stripe } from "stripe";
import useSWR from "swr";

export function PayoutMethodsDropdown() {
  const router = useRouter();
  const [openPopover, setOpenPopover] = useState(false);
  const { partner, loading: isPartnerLoading } = usePartnerProfile();

  const { data: bankAccount, isLoading: isBankAccountLoading } =
    useSWR<Stripe.BankAccount>(
      partner?.stripeConnectId ? "/api/partner-profile/payouts/settings" : null,
      fetcher,
    );

  const { executeAsync: executeStripeAsync, isPending: isStripePending } =
    useAction(generateStripeAccountLink, {
      onSuccess: ({ data }) => {
        if (!data?.url) {
          toast.error("Unable to create account link. Please contact support.");
          return;
        }
        router.push(data.url);
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  const { executeAsync: executePaypalAsync, isPending: isPaypalPending } =
    useAction(generatePaypalOAuthUrl, {
      onSuccess: ({ data }) => {
        if (!data?.url) {
          toast.error("Unable to redirect to Paypal. Please contact support.");
          return;
        }
        router.push(data.url);
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  if (!partner) {
    return null;
  }

  const payoutMethods = [
    {
      id: "paypal",
      label: "PayPal",
      color: "bg-blue-100",
      icon: <Paypal />,
      getAccountDetails: (partner: Pick<PartnerProps, "paypalEmail">) =>
        partner?.paypalEmail
          ? `Account ${partner.paypalEmail}`
          : "Not connected",
      isVisible: (partner: Pick<PartnerProps, "country" | "paypalEmail">) =>
        (partner.country &&
          PAYPAL_SUPPORTED_COUNTRIES.includes(partner.country)) ||
        partner.paypalEmail,
    },
    {
      id: "stripe",
      label: bankAccount?.bank_name || "Stripe",
      color: "bg-purple-100",
      icon: <StripeIcon />,
      getAccountDetails: (partner: Pick<PartnerProps, "stripeConnectId">) => {
        if (!partner?.stripeConnectId || !bankAccount) {
          return "Not connected";
        }

        return (
          <div className="flex items-center gap-1.5">
            <MatrixLines className="size-3" />
            {bankAccount.routing_number}
            <MatrixLines className="size-3" />
            ••••{bankAccount.last4}
          </div>
        );
      },
      isVisible: (partner: Pick<PartnerProps, "country" | "stripeConnectId">) =>
        (partner.country &&
          CONNECT_SUPPORTED_COUNTRIES.includes(partner.country)) ||
        partner.stripeConnectId,
    },
  ];

  const connectPayout = async (method: string) => {
    if (!partner) {
      return;
    }

    if (method === "paypal") {
      await executePaypalAsync();
    } else if (method === "stripe") {
      await executeStripeAsync();
    }

    setOpenPopover(false);
  };

  const selectedMethod = (() => {
    if (partner?.stripeConnectId) {
      return payoutMethods.find(({ id }) => id === "stripe");
    } else if (partner?.paypalEmail) {
      return payoutMethods.find(({ id }) => id === "paypal");
    }

    return null;
  })();

  const isConnected = (method: string) => {
    if (method === "paypal") {
      return !!partner?.paypalEmail;
    }

    if (method === "stripe") {
      return !!partner?.stripeConnectId;
    }

    return false;
  };

  return (
    <div>
      <Popover
        content={
          <div
            className={cn(
              "relative w-[350px]",
              isConnected("paypal") && "w-fit",
            )}
          >
            <div className="w-full space-y-0.5 rounded-lg bg-white p-1 text-sm">
              <div className="flex flex-col gap-2">
                {payoutMethods
                  .filter(({ isVisible }) => isVisible(partner))
                  .map(({ id, label, color, icon, getAccountDetails }) => {
                    return (
                      <div
                        key={id}
                        className="flex w-full items-center justify-between gap-4 rounded-md px-2 py-1.5 transition-all duration-75"
                      >
                        <div className="flex items-center gap-x-2">
                          <div
                            className={cn(
                              "size-8 shrink-0 rounded-lg p-2",
                              color,
                            )}
                          >
                            {icon}
                          </div>
                          <div>
                            <span className="text-xs font-medium text-neutral-900">
                              {label}
                            </span>
                            <span className="block w-44 truncate text-xs text-neutral-500">
                              {getAccountDetails(partner)}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant={isConnected(id) ? "secondary" : "primary"}
                          text={
                            isConnected(id)
                              ? id === "paypal"
                                ? "Switch account"
                                : "Manage"
                              : "Connect"
                          }
                          onClick={() => connectPayout(id)}
                          loading={isStripePending || isPaypalPending}
                          className="h-7 w-fit text-xs"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        }
        align="start"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        {isBankAccountLoading || isPartnerLoading ? (
          <div className="w-full rounded-lg border border-neutral-200">
            <PayoutMethodSkeleton />
          </div>
        ) : (
          <button
            onClick={() => setOpenPopover(!openPopover)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg bg-white p-2 text-left text-sm transition-all duration-75",
              "border border-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-black/50",
            )}
          >
            <div className="flex min-w-0 items-center gap-x-2.5 pr-2">
              <div
                className={cn(
                  "size-8 shrink-0 rounded-lg p-2",
                  selectedMethod?.color,
                )}
              >
                {selectedMethod?.icon}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-medium text-neutral-900">
                  {selectedMethod?.label}
                </span>
                <span className="block w-44 truncate text-xs text-neutral-500">
                  {selectedMethod?.getAccountDetails(partner)}
                </span>
              </div>
            </div>
            <ChevronsUpDown
              className="size-4 shrink-0 text-neutral-400"
              aria-hidden="true"
            />
          </button>
        )}
      </Popover>
    </div>
  );
}

function PayoutMethodSkeleton() {
  return (
    <div className="flex w-full items-center justify-between rounded-lg p-1.5">
      <div className="flex min-w-0 items-center gap-x-2.5 pr-2">
        <div className="size-8 shrink-0 animate-pulse rounded-lg bg-neutral-200" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
          <div className="mt-1 h-3 w-44 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
      <div className="size-4 shrink-0 animate-pulse rounded bg-neutral-200" />
    </div>
  );
}
