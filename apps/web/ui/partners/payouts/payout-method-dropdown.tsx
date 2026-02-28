"use client";

import usePartnerPayoutSettings from "@/lib/swr/use-partner-payout-settings";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import type { PartnerPayoutMethodSetting } from "@/lib/types";
import { partnerPayoutMethodSchema } from "@/lib/zod/schemas/partner-profile";
import { getPayoutMethodIconConfig } from "@/ui/partners/payouts/payout-method-config";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { Button, Popover } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import { useCallback, useState } from "react";
import { usePayoutConnectFlow } from "./use-payout-connect-flow";

export function PayoutMethodDropdown() {
  const [openPopover, setOpenPopover] = useState(false);
  const { partner, loading: isPartnerLoading } = usePartnerProfile();

  const {
    connect,
    isPending,
    BankAccountRequirementsModal,
    StablecoinPayoutModal,
  } = usePayoutConnectFlow();

  const { payoutMethods: payoutMethodsData, isLoading: isSettingsLoading } =
    usePartnerPayoutSettings();

  const payoutMethods =
    !payoutMethodsData || !Array.isArray(payoutMethodsData)
      ? null
      : payoutMethodsData.map((m) => partnerPayoutMethodSchema.parse(m));

  const hasConnected = payoutMethods?.some((m) => m.connected) ?? false;

  const handleAction = useCallback(
    (type: PartnerPayoutMethod, isManage: boolean) => {
      setOpenPopover(false);
      connect(type, { isManage });
    },
    [connect],
  );

  const selectedMethod =
    payoutMethods?.find((m) => m.default) ??
    payoutMethods?.find((m) => m.connected);

  const isLoading = isPartnerLoading || isSettingsLoading;

  if (!partner || !hasConnected) {
    return null;
  }

  return (
    <>
      {BankAccountRequirementsModal}
      {StablecoinPayoutModal}
      <div>
        <Popover
          popoverContentClassName="w-[var(--radix-popover-trigger-width)]"
          content={
            <div className="relative w-full">
              <div className="w-full space-y-0.5 rounded-lg bg-white p-1 text-sm">
                <div className="flex flex-col gap-2">
                  {payoutMethods?.map((method) => (
                    <PayoutMethodItem
                      key={method.type}
                      method={method}
                      onAction={handleAction}
                      isActionPending={isPending}
                    />
                  ))}
                </div>
              </div>
            </div>
          }
          align="start"
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        >
          <button
            type="button"
            onClick={() => setOpenPopover(!openPopover)}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between rounded-lg bg-white p-2 text-left text-sm transition-colors duration-75",
              "border border-neutral-200 outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-black/50",
            )}
          >
            {isLoading || !selectedMethod ? (
              <PayoutMethodSkeleton />
            ) : (
              <SelectedMethodDisplay method={selectedMethod} />
            )}
          </button>
        </Popover>
      </div>
    </>
  );
}

function PayoutMethodItem({
  method,
  onAction,
  isActionPending,
}: {
  method: PartnerPayoutMethodSetting;
  onAction: (type: PartnerPayoutMethod, isManage: boolean) => void;
  isActionPending: boolean;
}) {
  const { Icon, wrapperClass } = getPayoutMethodIconConfig(method.type);

  return (
    <div className="flex w-full cursor-default items-center justify-between gap-4 rounded-md px-2 py-1.5 transition-colors duration-75 hover:bg-neutral-50">
      <div className="flex min-w-0 flex-1 items-center gap-x-2">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border",
            wrapperClass,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-neutral-900">
              {method.label}
            </span>

            {method.default && (
              <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                Default
              </span>
            )}
          </div>
          <span className="mt-0.5 block truncate text-xs text-neutral-500">
            {method.identifier ?? "Not connected"}
          </span>
        </div>
      </div>
      <Button
        variant={method.connected ? "secondary" : "primary"}
        text={method.connected ? "Manage" : "Connect"}
        onClick={() => onAction(method.type, method.connected)}
        loading={isActionPending}
        className="h-7 w-fit shrink-0 cursor-pointer text-xs"
      />
    </div>
  );
}

function SelectedMethodDisplay({
  method,
}: {
  method: PartnerPayoutMethodSetting;
}) {
  const { Icon, wrapperClass } = getPayoutMethodIconConfig(method.type);
  return (
    <>
      <div className="flex min-w-0 items-center gap-x-2.5 pr-2">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
            wrapperClass,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="block text-xs font-medium text-neutral-900">
              {method.label}
            </span>
            {method.default && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                Default
              </span>
            )}
          </div>
          <span className="block truncate text-xs text-neutral-500">
            {method.identifier ?? "Not connected"}
          </span>
        </div>
      </div>
      <ChevronsUpDown
        className="size-4 shrink-0 text-neutral-400"
        aria-hidden="true"
      />
    </>
  );
}

function PayoutMethodSkeleton() {
  return (
    <>
      <div className="flex min-w-0 items-center gap-x-2.5 pr-2">
        <div className="size-8 shrink-0 animate-pulse rounded-lg bg-neutral-200" />
        <div className="min-w-0">
          <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
          <div className="mt-1 h-3 w-44 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
      <div className="size-4 shrink-0 animate-pulse rounded bg-neutral-200" />
    </>
  );
}
