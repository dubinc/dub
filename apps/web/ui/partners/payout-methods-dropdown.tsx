"use client";

import { createAccountLinkAction } from "@/lib/actions/partners/create-account-link";
import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerProps } from "@/lib/types";
import { Button, Paypal, Popover, Stripe as StripeIcon } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import type { Stripe } from "stripe";
import useSWR from "swr";

export function PayoutMethodsDropdown() {
  const { partner } = usePartnerProfile();
  const [openPopover, setOpenPopover] = useState(false);

  const { data: bankAccount } = useSWR<Stripe.BankAccount>(
    partner?.stripeConnectId ? "/api/partner-profile/payouts/settings" : null,
    fetcher,
  );

  const payoutMethods = [
    {
      id: "paypal",
      label: "PayPal",
      color: "bg-blue-100",
      icon: <Paypal />,
      getAccountDetails: (partner: Pick<PartnerProps, "paypalEmail">) =>
        `Account ${partner?.paypalEmail}` || "Not connected",
      isVisible: (partner: Pick<PartnerProps, "country">) =>
        partner?.country !== "US",
    },
    {
      id: "stripe",
      label: "Stripe Test Bank",
      color: "bg-purple-100",
      icon: <StripeIcon />,
      getAccountDetails: (partner: Pick<PartnerProps, "stripeConnectId">) => {
        if (!partner?.stripeConnectId || !bankAccount) {
          return "Not connected";
        }

        return `${bankAccount.bank_name} •••• ${bankAccount.last4}`;
      },
      isVisible: () => true,
    },
  ];

  const { executeAsync: executeStripeAsync, isPending: isStripePending } =
    useAction(createAccountLinkAction, {
      onSuccess: ({ data }) => {
        if (!data?.url) {
          toast.error("Unable to create account link. Please contact support.");
          return;
        }
        window.open(data.url, "_blank");
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
        window.open(data.url, "_blank");
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  if (!partner) {
    return null;
  }

  const handlePayoutMethodSelect = async (method: string) => {
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
    // For US users, always show Stripe
    if (partner?.country === "US") {
      return payoutMethods.find(({ id }) => id === "stripe")!;
    }

    // For non-US users
    // If PayPal is connected, show PayPal
    if (partner?.paypalEmail) {
      return payoutMethods.find(({ id }) => id === "paypal");
    }

    // If Stripe is connected, show Stripe
    if (partner?.stripeConnectId) {
      return payoutMethods.find(({ id }) => id === "stripe");
    }
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
          <div className="relative w-[350px]">
            <div className="w-full space-y-0.5 rounded-lg bg-white p-2 text-sm">
              <div className="flex flex-col gap-2">
                {payoutMethods
                  .filter(({ isVisible }) => isVisible(partner))
                  .map(({ id, label, color, icon, getAccountDetails }) => {
                    return (
                      <div
                        key={id}
                        className={cn(
                          "relative flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-2 transition-all duration-75",
                          "hover:bg-neutral-100",
                        )}
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
                            <span className="block text-xs font-medium text-neutral-900">
                              {label}
                            </span>
                            <span className="block text-xs text-neutral-500">
                              {getAccountDetails(partner)}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant={isConnected(id) ? "ghost" : "primary"}
                          text={isConnected(id) ? "Manage" : "Connect"}
                          onClick={() => handlePayoutMethodSelect(id)}
                          className="h-7 w-fit"
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
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg p-1.5 text-left text-sm transition-all duration-75",
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
              <div className="truncate text-sm font-medium leading-5 text-neutral-900">
                {selectedMethod?.label}
              </div>
              <div className="truncate text-xs text-neutral-500">
                {selectedMethod?.getAccountDetails(partner)}
              </div>
            </div>
          </div>
          <ChevronsUpDown
            className="size-4 shrink-0 text-neutral-400"
            aria-hidden="true"
          />
        </button>
      </Popover>
    </div>
  );
}
