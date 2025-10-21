"use client";

import { updatePartnerPayoutSettingsAction } from "@/lib/actions/partners/update-partner-payout-settings";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { partnerPayoutSettingsSchema } from "@/lib/zod/schemas/partners";
import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import { PayoutMethodsDropdown } from "@/ui/partners/payout-methods-dropdown";
import {
  Button,
  InfoTooltip,
  Sheet,
  SimpleTooltipContent,
  useScrollProgress,
} from "@dub/ui";
import { CONNECT_SUPPORTED_COUNTRIES, COUNTRIES } from "@dub/utils";
import { COUNTRY_CURRENCY_CODES } from "@dub/utils/src";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { z } from "zod";

type PartnerPayoutSettingsSheetProps = {
  showPartnerPayoutSettingsSheet: boolean;
  setShowPartnerPayoutSettingsSheet: Dispatch<SetStateAction<boolean>>;
};

type PartnerPayoutSettingsFormData = z.infer<
  typeof partnerPayoutSettingsSchema
>;

function PartnerPayoutSettingsSheet(props: PartnerPayoutSettingsSheetProps) {
  const { showPartnerPayoutSettingsSheet, setShowPartnerPayoutSettingsSheet } =
    props;

  return (
    <Sheet
      open={showPartnerPayoutSettingsSheet}
      onOpenChange={setShowPartnerPayoutSettingsSheet}
    >
      <PartnerPayoutSettingsSheetInner {...props} />
    </Sheet>
  );
}

function PartnerPayoutSettingsSheetInner({
  setShowPartnerPayoutSettingsSheet,
}: PartnerPayoutSettingsSheetProps) {
  const { partner } = usePartnerProfile();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<PartnerPayoutSettingsFormData>({
    defaultValues: {
      companyName: partner?.companyName || undefined,
      address: partner?.invoiceSettings?.address || undefined,
      taxId: partner?.invoiceSettings?.taxId || undefined,
    },
  });

  const { executeAsync, isPending } = useAction(
    updatePartnerPayoutSettingsAction,
    {
      onSuccess: async () => {
        toast.success("Payout settings updated successfully!");
        setShowPartnerPayoutSettingsSheet(false);
        mutatePrefix("/api/partner-profile");
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const onSubmit = async (data: PartnerPayoutSettingsFormData) => {
    await executeAsync(data);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <Sheet.Title className="flex items-center gap-1 text-lg font-semibold">
          Payout settings{" "}
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Learn how to set up your payout account and receive payouts."
                cta="Learn more."
                href="https://dub.co/help/article/receiving-payouts"
              />
            }
          />
        </Sheet.Title>
      </div>

      <div className="relative flex-1 overflow-y-auto">
        <div
          ref={scrollRef}
          onScroll={updateScrollProgress}
          className="scrollbar-hide h-full space-y-10 overflow-y-auto bg-neutral-50 p-4 sm:p-6"
        >
          <div className="divide-y divide-neutral-200">
            {/* Connected payout account */}
            <div className="space-y-3 pb-6">
              <div>
                <h4 className="text-base font-semibold leading-6 text-neutral-900">
                  Connected payout account
                </h4>
              </div>

              {!partner?.payoutsEnabledAt ? (
                <ConnectPayoutButton className="h-10 rounded-lg px-4 py-2" />
              ) : (
                <PayoutMethodsDropdown />
              )}

              {partner?.country &&
                CONNECT_SUPPORTED_COUNTRIES.includes(partner.country) && (
                  <p className="text-xs text-neutral-500">
                    For compliance reasons, your payout bank account must match
                    your local currency. Since you're based in{" "}
                    <Link
                      href="/profile"
                      target="_blank"
                      className="font-medium text-neutral-900 underline decoration-dotted underline-offset-2"
                    >
                      {COUNTRIES[partner.country]}
                    </Link>{" "}
                    , you will need to connect a{" "}
                    <span className="font-medium text-neutral-900">
                      {COUNTRY_CURRENCY_CODES[partner.country]} bank account
                    </span>{" "}
                    to receive payouts.{" "}
                    <Link
                      href="https://dub.co/help/article/receiving-payouts"
                      target="_blank"
                      className="font-medium text-neutral-900 underline decoration-dotted underline-offset-2"
                    >
                      Learn more ↗
                    </Link>
                  </p>
                )}
            </div>

            {/* Invoice details */}
            <div className="space-y-6 py-6">
              <div>
                <h4 className="text-base font-semibold leading-6 text-neutral-900">
                  Invoice details (optional)
                </h4>
                <p className="text-sm font-medium text-neutral-500">
                  This information is added to your payout invoices.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-900">
                  Business name
                </label>
                <div className="relative mt-1.5 rounded-md shadow-sm">
                  <input
                    autoFocus
                    className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    {...register("companyName")}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-900">
                  Business address
                </label>
                <TextareaAutosize
                  className="mt-1.5 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  minRows={3}
                  {...register("address")}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-neutral-900">
                  Business tax ID
                </label>
                <div className="relative mt-1.5 rounded-md shadow-sm">
                  <input
                    className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    {...register("taxId")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:bottom-0"
          style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
        <Button
          variant="secondary"
          text="Cancel"
          disabled={isPending}
          className="h-8 w-fit px-3"
          onClick={() => setShowPartnerPayoutSettingsSheet(false)}
        />

        <Button
          text="Save"
          className="h-8 w-fit px-3"
          loading={isPending}
          disabled={!isDirty}
          type="submit"
        />
      </div>
    </form>
  );
}

export function usePartnerPayoutSettingsSheet() {
  const [showPartnerPayoutSettingsSheet, setShowPartnerPayoutSettingsSheet] =
    useState(false);

  const PartnerPayoutSettingsSheetCallback = useCallback(() => {
    return (
      <PartnerPayoutSettingsSheet
        showPartnerPayoutSettingsSheet={showPartnerPayoutSettingsSheet}
        setShowPartnerPayoutSettingsSheet={setShowPartnerPayoutSettingsSheet}
      />
    );
  }, [showPartnerPayoutSettingsSheet, setShowPartnerPayoutSettingsSheet]);

  return useMemo(
    () => ({
      setShowPartnerPayoutSettingsSheet,
      PartnerPayoutSettingsSheet: PartnerPayoutSettingsSheetCallback,
    }),
    [setShowPartnerPayoutSettingsSheet, PartnerPayoutSettingsSheetCallback],
  );
}
