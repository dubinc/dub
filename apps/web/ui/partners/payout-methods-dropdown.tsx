"use client";

import { createAccountLinkAction } from "@/lib/actions/partners/create-account-link";
import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, Paypal, Popover, Stripe } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

const payoutMethods = [
  {
    id: "paypal",
    label: "PayPal",
    color: "bg-blue-100",
    icon: <Paypal />,
    getAccountDetails: (partner) =>
      `Account ${partner?.paypalEmail || "Not connected"}`,
    isVisible: (partner) => partner?.country !== "US",
  },
  {
    id: "stripe",
    label: "Stripe Test Bank",
    color: "bg-purple-100",
    icon: <Stripe />,
    getAccountDetails: (partner) =>
      partner?.stripeConnectId
        ? `${partner.stripeConnectId} •••• 5290`
        : "Not connected",
    isVisible: () => true,
  },
];

export function PayoutMethodsDropdown() {
  const { partner } = usePartnerProfile();
  const [openPopover, setOpenPopover] = useState(false);

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

  const handlePayoutMethodSelect = async (method: string) => {
    if (!partner) {
      toast.error("Invalid partner profile. Please log out and log back in.");
      return;
    }

    if (method === "paypal") {
      await executePaypalAsync();
    } else if (method === "stripe") {
      await executeStripeAsync();
    }
    setOpenPopover(false);
  };

  const selectedMethod =
    payoutMethods.find(({ id }) => partner?.supportedPayoutMethod === id) ||
    payoutMethods[0];

  const isConnected = (method: string) => {
    if (method === "paypal") return !!partner?.paypalEmail;
    if (method === "stripe") return !!partner?.stripeConnectId;
    return false;
  };

  return (
    <div>
      <Popover
        content={
          <div className="relative w-full">
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
                          variant={isConnected(id) ? "ghost" : "default"}
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
            "flex w-full items-center justify-between rounded-lg p-1.5 text-left text-sm transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80 data-[state=open]:bg-neutral-200/80",
            "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
          )}
        >
          <div className="flex min-w-0 items-center gap-x-2.5 pr-2">
            <div className="size-8 shrink-0 rounded-md bg-neutral-100 p-1">
              {selectedMethod.icon}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium leading-5 text-neutral-900">
                {selectedMethod.label}
              </div>
              <div className="truncate text-xs text-neutral-500">
                {selectedMethod.getAccountDetails(partner)}
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